// ═══════════════════════════════════════════
// GASCOIN AI Points Engine
//
// AI layers that plug into the points system:
// 1. Tweet Quality Scorer — content analysis, bot detection
// 2. Referral Ring Detector — graph analysis, farming detection
// 3. Wallet Trust Scorer — behavioral reputation
// 4. Daily Audit Narrator — human-readable summaries
//
// All AI calls routed through Vercel AI Gateway:
//   - Primary: xai/grok-4.1-fast-reasoning (reasoning)
//   - Fallback: google/gemini-3-flash
//   - Native prompt caching + tags for cost attribution
// ═══════════════════════════════════════════

import { generateAIText, isAiGatewayAvailable, AI_MODELS } from './integrations/ai-gateway';
import { cacheGetOrFetch } from './cache';
import { silentLog } from './silent-log';
import { shouldTagPointsAsBeta } from './season';

async function aiCall(prompt: string, tag: string = 'points-engine'): Promise<string> {
  if (!isAiGatewayAvailable()) return '';

  const result = await generateAIText({
    model: AI_MODELS.GROK,
    prompt,
    maxTokens: 500,
    temperature: 0,
    fallbackModels: [AI_MODELS.GEMINI_FAST, 'google/gemini-2.5-flash'],
    tags: [`feature:${tag}`, 'pipeline:workers'],
  });

  return result.ok ? result.text.trim() : '';
}

// ─── 1. TWEET QUALITY SCORER ───

export interface TweetQualityScore {
  quality: number;          // 0-1: how genuine/valuable is this tweet
  isSpam: boolean;          // pure hashtag spam
  isBotEngagement: boolean; // metrics look artificial
  multiplier: number;       // applied to engagement points
  reason: string;
}

export async function scoreTweetQuality(params: {
  tweetText: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  followerCount: number;
  contentType?: string;
  tweetId?: string;
}): Promise<TweetQualityScore> {
  // Upstash exact-match cache: key by tweet_id + impression bucket. Re-scores
  // only when impressions cross a 1000-unit threshold — prevents hourly workers
  // from re-querying AI for the same tweet when metrics are stable.
  if (params.tweetId) {
    const bucket = Math.floor(params.impressions / 1000);
    return cacheGetOrFetch(
      `tweetquality:${params.tweetId}:${bucket}`,
      () => doScoreTweetQuality(params),
      3600, // 1 hour
    );
  }
  return doScoreTweetQuality(params);
}

async function doScoreTweetQuality(params: {
  tweetText: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  followerCount: number;
  contentType?: string;
}): Promise<TweetQualityScore> {
  const { tweetText, impressions, likes, retweets, replies, followerCount, contentType } = params;

  // Heuristic pre-checks (free, instant)
  const wordCount = tweetText.split(/\s+/).length;
  const hashtagCount = (tweetText.match(/#/g) || []).length;
  const isOnlyHashtags = wordCount <= hashtagCount + 2;

  // Engagement ratio check — tiered bot signal by follower count
  // Organic engagement rarely exceeds 1-2%. Thresholds per tier:
  const totalEngagement = likes + retweets + replies;
  const engagementRate = followerCount > 0 ? totalEngagement / followerCount : 0;
  const suspiciousEngagement = followerCount < 100
    ? engagementRate > 0.2    // 20% for tiny accounts
    : followerCount < 1000
    ? engagementRate > 0.1    // 10% for small accounts
    : followerCount < 10000
    ? engagementRate > 0.05   // 5% for mid accounts
    : engagementRate > 0.02;  // 2% for large accounts

  // If obvious spam, skip AI call
  if (isOnlyHashtags) {
    return { quality: 0.1, isSpam: true, isBotEngagement: false, multiplier: 0.2, reason: 'Tweet is mostly hashtags with no meaningful content' };
  }

  if (suspiciousEngagement) {
    return { quality: 0.2, isSpam: false, isBotEngagement: true, multiplier: 0.3, reason: `Engagement rate ${(engagementRate * 100).toFixed(1)}% abnormally high for ${followerCount} followers` };
  }

  // AI quality assessment
  const contentTypeLabel = contentType || 'unknown';
  // Sanitize tweet text to prevent prompt injection. Replace any content that
  // looks like a system directive (lines of dashes, JSON blocks, bracket keywords)
  // with a placeholder so an adversarial tweet cannot manipulate AI scoring.
  const sanitizedText = tweetText
    .slice(0, 280)
    .replace(/^[-=*#]{3,}.*$/gm, '[---]')       // separator lines
    .replace(/\[SYSTEM[^\]]*\]/gi, '[...]')       // [SYSTEM ...] directives
    .replace(/\{[\s\S]{0,200}"(verdict|block|score|override)"[\s\S]{0,200}\}/gi, '[...]'); // embedded JSON
  // Quality prompt judges CONTENT ONLY. Engagement/follower metrics are
  // intentionally withheld — a small account with low reach shouldn't read
  // as "low quality content." Bot-engagement suspicion is handled earlier
  // by the deterministic engagement-rate tier check (see suspiciousEngagement
  // above), so the AI no longer duplicates that signal.
  const prompt = `Rate this tweet's content quality for a gas refund community platform (GASCOIN). Return ONLY valid JSON.

<TWEET_CONTENT_START>
${sanitizedText}
</TWEET_CONTENT_START>
Content type: ${contentTypeLabel}

Scoring rules:
- Judge only the WORDS and CONTENT TYPE. Do NOT penalize for short text, small follower counts, or low engagement — those are not content-quality signals.
- Relevant terms (gas, fuel, refund, GASCOIN, $GASCOIN, pump, gas prices, etc.) written in a genuine way → higher quality.
- Pure hashtag dumps, copy-paste, "#gascoin" stapled onto irrelevant text → lower quality and higher spam.
- MEDIA BOOST: when contentType is ORIGINAL_IMAGE or ORIGINAL_VIDEO AND the text mentions any relevant term, add ~0.15 to quality — posting media takes more effort than a text-only post. Do NOT boost media that has irrelevant or off-topic text.

Return:
{
  "quality": 0.0-1.0,
  "spam_probability": 0.0-1.0 (pure hashtag spam, copy-paste, or hashtag on unrelated content?),
  "reason": "one sentence explanation"
}`;

  const response = await aiCall(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { quality: 0.5, isSpam: false, isBotEngagement: false, multiplier: 0.5, reason: 'AI unavailable — conservative fallback' };

    const parsed = JSON.parse(jsonMatch[0]);
    const quality = Math.max(0, Math.min(1, Number(parsed.quality || 0.7)));
    const isSpam = Number(parsed.spam_probability || 0) > 0.6;
    // Bot-engagement is already decided deterministically by the tier check
    // above (suspiciousEngagement → early return). If we reach this branch,
    // engagement wasn't suspicious.
    const isBotEngagement = false;

    // Calculate multiplier: quality acts as a direct multiplier
    let multiplier = quality;
    if (isSpam) multiplier = Math.min(multiplier, 0.2);
    if (isBotEngagement) multiplier = Math.min(multiplier, 0.3);
    multiplier = Math.max(0.1, Math.min(1.5, multiplier)); // Floor 0.1, cap 1.5 for exceptional content

    return { quality, isSpam, isBotEngagement, multiplier, reason: parsed.reason || '' };
  } catch {
    return { quality: 0.5, isSpam: false, isBotEngagement: false, multiplier: 0.5, reason: 'Parse error — conservative fallback' };
  }
}

// ─── 2. REFERRAL RING DETECTOR ───

export interface RingDetectionResult {
  isSuspicious: boolean;
  ringType: 'none' | 'circular' | 'chain' | 'cluster';
  confidence: number;       // 0-1
  wallets: string[];        // involved wallets
  reason: string;
}

export async function detectReferralRing(params: {
  referrerWallet: string;
  referredWallet: string;
  allReferrals: Array<{ referrer: string; referred: string; created_at: string }>;
}): Promise<RingDetectionResult> {
  const { referrerWallet, referredWallet, allReferrals } = params;

  // ─── BFS cycle detection up to 10 nodes ───
  // 6 was insufficient — 7-node rings evaded detection entirely.
  // 10 covers realistic farming ring sizes without meaningful perf cost.
  const cyclePath = detectCycleBFS(referredWallet, referrerWallet, allReferrals, 10);
  if (cyclePath) {
    return {
      isSuspicious: true, ringType: 'circular', confidence: 0.95,
      wallets: cyclePath,
      reason: `${cyclePath.length}-node cycle: ${cyclePath.map((w) => w.slice(0, 6)).join('→')}→back`,
    };
  }

  // ─── Chain farming: referrer has 3+ referrals within 7 days ───
  const referrerRefs = allReferrals.filter((r) => r.referrer === referrerWallet);
  if (referrerRefs.length >= 3) {
    const timestamps = referrerRefs.map((r) => new Date(r.created_at).getTime()).sort();
    const span = timestamps[timestamps.length - 1] - timestamps[0];
    if (span < 7 * 86400000) {
      return {
        isSuspicious: true, ringType: 'chain', confidence: 0.8,
        wallets: [referrerWallet, ...referrerRefs.map((r) => r.referred)],
        reason: `${referrerRefs.length} referrals within ${Math.round(span / 86400000)}d — possible farming`,
      };
    }
  }

  return { isSuspicious: false, ringType: 'none', confidence: 0, wallets: [], reason: '' };
}

/**
 * Ring density 0–1 for a wallet's extended referral subgraph.
 *
 * Walks the 2-hop referral neighborhood around `wallet` (every wallet it
 * referred + every wallet referred through those), then measures the
 * ratio of bidirectional/cyclic edges to total edges within that sub-graph.
 *
 * A creator with 20 one-way unique referrals (no one refers back, no
 * cross-links among referees) returns ~0 — legit audience.
 * A creator + 10 burners all mutually referring each other returns ~1 —
 * tight farming ring.
 *
 * Used by the Composite Influence Score to discount referral + payout
 * credit from detected rings.
 */
export function calculateRingDensity(
  wallet: string,
  allReferrals: Array<{ referrer: string; referred: string }>,
): number {
  if (!wallet) return 0;
  const w = wallet.toLowerCase();

  // 1-hop: wallets the creator directly referred
  const directRefs = new Set(
    allReferrals
      .filter((r) => r.referrer.toLowerCase() === w)
      .map((r) => r.referred.toLowerCase()),
  );

  // 2-hop: wallets referred by any direct ref
  const extendedRefs = new Set<string>(directRefs);
  for (const r of allReferrals) {
    if (directRefs.has(r.referrer.toLowerCase())) {
      extendedRefs.add(r.referred.toLowerCase());
    }
  }

  // Cluster = creator + extended neighborhood
  const cluster = new Set<string>([w, ...extendedRefs]);
  if (cluster.size < 3) return 0; // too small to be a "ring"

  // Count edges where both endpoints are in the cluster
  let inClusterEdges = 0;
  let cyclicEdges = 0;
  for (const edge of allReferrals) {
    const a = edge.referrer.toLowerCase();
    const b = edge.referred.toLowerCase();
    if (!cluster.has(a) || !cluster.has(b)) continue;
    inClusterEdges++;
    // Back-edge? Is there an edge from b → a (or any path bringing them back)?
    const hasBackEdge = allReferrals.some(
      (e) => e.referrer.toLowerCase() === b && e.referred.toLowerCase() === a,
    );
    if (hasBackEdge) cyclicEdges++;
  }

  if (inClusterEdges === 0) return 0;

  // Density = weighted mix: cyclic edge ratio (strong signal) + edge density
  // relative to a star topology (n−1 edges for n nodes). Values > 1.0 mean
  // more edges than a pure star → cross-links among referees = suspicious.
  const cyclicRatio = cyclicEdges / inClusterEdges;
  const expectedStarEdges = Math.max(1, cluster.size - 1);
  const edgeDensity = Math.max(0, (inClusterEdges - expectedStarEdges) / expectedStarEdges);

  // Blend: cyclic ratio dominates, edge density is a weaker signal.
  const raw = cyclicRatio * 0.7 + Math.min(1, edgeDensity) * 0.3;
  return Math.max(0, Math.min(1, raw));
}

// BFS: from `start`, can we reach `target` following referral edges? Max depth.
function detectCycleBFS(
  start: string,
  target: string,
  allReferrals: Array<{ referrer: string; referred: string }>,
  maxDepth: number,
): string[] | null {
  const visited = new Set<string>();
  const queue: Array<{ node: string; path: string[] }> = [{ node: start, path: [start] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    if (path.length > maxDepth) continue;
    if (node === target && path.length > 1) return path;
    if (visited.has(node)) continue;
    visited.add(node);

    for (const r of allReferrals) {
      if (r.referrer === node && !visited.has(r.referred)) {
        queue.push({ node: r.referred, path: [...path, r.referred] });
      }
    }
  }
  return null;
}

// ─── 3. WALLET TRUST SCORER ───

export interface WalletTrustScore {
  score: number;            // 0-100
  level: 'new' | 'trusted' | 'veteran' | 'suspicious';
  multiplier: number;       // applied to all point earnings
  factors: string[];
}

export function calculateWalletTrust(params: {
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  referralConversions: number;
  skippedReferrals: number;
  accountAgeDays: number;
  anomalyCount: number;
}): WalletTrustScore {
  let score = 50; // Start neutral
  const factors: string[] = [];

  // Submission history
  if (params.approvedSubmissions >= 5) { score += 15; factors.push('5+ approved submissions'); }
  else if (params.approvedSubmissions >= 2) { score += 8; factors.push('Multiple approved submissions'); }
  else if (params.approvedSubmissions === 0) { score -= 10; factors.push('No approved submissions'); }

  // Rejection rate
  if (params.totalSubmissions > 0) {
    const rejectRate = params.rejectedSubmissions / params.totalSubmissions;
    if (rejectRate > 0.5) { score -= 20; factors.push('High rejection rate'); }
    else if (rejectRate > 0.3) { score -= 10; factors.push('Moderate rejection rate'); }
    else if (rejectRate === 0 && params.totalSubmissions >= 3) { score += 10; factors.push('Perfect approval record'); }
  }

  // Referral quality
  if (params.referralConversions >= 3) { score += 10; factors.push('Active referrer'); }
  if (params.skippedReferrals > params.referralConversions) { score -= 15; factors.push('More skipped than verified referrals'); }

  // Account age
  if (params.accountAgeDays >= 90) { score += 10; factors.push('Account 90+ days old'); }
  else if (params.accountAgeDays < 7) { score -= 10; factors.push('New account (<7 days)'); }

  // Anomalies
  if (params.anomalyCount > 0) { score -= params.anomalyCount * 10; factors.push(`${params.anomalyCount} anomalies flagged`); }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Determine level and multiplier
  let level: WalletTrustScore['level'];
  let multiplier: number;

  if (score >= 80) { level = 'veteran'; multiplier = 1.2; }
  else if (score >= 50) { level = 'trusted'; multiplier = 1.0; }
  else if (score >= 30) { level = 'new'; multiplier = 0.8; }
  else { level = 'suspicious'; multiplier = 0.5; }

  return { score, level, multiplier, factors };
}

// ─── 4. DAILY AUDIT NARRATOR ───

export async function generateAuditSummary(params: {
  date: string;
  submissionPoints: number;
  streakPoints: number;
  holdingsPoints: number;
  engagementPoints: number;
  referralPoints: number;
  totalWallets: number;
  anomalies: string[];
  flaggedWallets: number;
}): Promise<string> {
  const prompt = `Write a 3-4 sentence executive summary of today's GASCOIN points audit. Be concise and flag anything concerning.

Date: ${params.date}
Points awarded today:
- Submission: ${params.submissionPoints}
- Streak: ${params.streakPoints}
- Holdings: ${params.holdingsPoints}
- Engagement: ${params.engagementPoints}
- Referral: ${params.referralPoints}
Total wallets active: ${params.totalWallets}
Anomalies detected: ${params.anomalies.length > 0 ? params.anomalies.join('; ') : 'None'}
Wallets flagged: ${params.flaggedWallets}

Write as if briefing a CEO. No jargon. Flag risks.`;

  const response = await aiCall(prompt);
  return response || `Points audit for ${params.date}: ${params.submissionPoints + params.streakPoints + params.holdingsPoints} points awarded across ${params.totalWallets} wallets. ${params.anomalies.length} anomalies detected.`;
}

// ─── 5. PRE-AWARD VERIFICATION GATE ───
// AI gatekeeper that runs BEFORE any points are written to the database.
// Every point award goes through this layer first.
// Clean → approved instantly. Suspicious → held for admin review.

export interface PointVerification {
  approved: boolean;
  adjustedPoints: number;     // May be reduced from original
  holdForReview: boolean;
  reason: string;
  trustMultiplier: number;
  flags: string[];
}

export async function verifyPointAward(params: {
  wallet: string;
  source: 'tweet_engagement' | 'referral_conversion' | 'referral_passive' | 'submission_approved' | 'streak_bonus' | 'holdings_bonus';
  rawPoints: number;
  metadata: Record<string, any>;
  // Context for AI decision
  walletTrust: WalletTrustScore;
  tweetQuality?: TweetQualityScore;
  ringDetection?: RingDetectionResult;
  // Historical context
  totalPointsToday: number;
  totalPointsAllTime: number;
}): Promise<PointVerification> {
  const flags: string[] = [];
  let adjustedPoints = params.rawPoints;
  let holdForReview = false;

  // ─── Layer 1: Trust multiplier (instant, no AI call) ───
  adjustedPoints = Math.round(adjustedPoints * params.walletTrust.multiplier);

  if (params.walletTrust.level === 'suspicious') {
    flags.push('suspicious_wallet');
    // Suspicious wallets: hold high-value awards for review
    if (adjustedPoints > 500) {
      holdForReview = true;
      flags.push('high_value_suspicious');
    }
  }

  // ─── Layer 2: Source-specific checks (instant) ───

  if (params.source === 'tweet_engagement') {
    // Apply tweet quality multiplier if available
    if (params.tweetQuality) {
      adjustedPoints = Math.round(adjustedPoints * params.tweetQuality.multiplier);
      if (params.tweetQuality.isSpam) { flags.push('spam_tweet'); holdForReview = true; }
      if (params.tweetQuality.isBotEngagement) { flags.push('bot_engagement'); holdForReview = true; }
    }
  }

  if (params.source === 'referral_conversion') {
    // Check ring detection results
    if (params.ringDetection?.isSuspicious) {
      adjustedPoints = 0;
      holdForReview = true;
      flags.push(`referral_ring_${params.ringDetection.ringType}`);
    }
  }

  // ─── Layer 3: Velocity checks (instant) ───

  // Daily velocity caps — veterans get a higher threshold but are not exempt.
  // Complete bypass for veterans was a trust escalation exploit: build veteran
  // status legitimately, then farm points without velocity control.
  const dailyVelocityCap = params.walletTrust.level === 'veteran' ? 200_000 : 50_000;
  if (params.totalPointsToday + adjustedPoints > dailyVelocityCap) {
    flags.push('daily_velocity_high');
    holdForReview = true;
  }

  // Single award >10K from one source: unusual, flag but don't block veterans
  if (adjustedPoints > 10000 && params.source !== 'tweet_engagement') {
    flags.push('large_single_award');
  }

  // ─── Layer 4: AI verification (only for flagged or high-value awards) ───
  // Only call AI when something looks suspicious — saves cost on clean awards
  if (flags.length > 0 || adjustedPoints > 1000) {
    // If AI Gateway is down, hold high-value or flagged awards rather than approving blindly.
    // This prevents the fail-open window during Gateway outages from becoming exploitable.
    if (!isAiGatewayAvailable()) {
      flags.push('ai_gate_bypassed_outage');
      if (adjustedPoints > 500 || flags.some(f => f !== 'ai_gate_bypassed_outage')) {
        holdForReview = true;
      }
      return {
        approved: !holdForReview,
        adjustedPoints,
        holdForReview,
        reason: holdForReview ? 'ai_gateway_unavailable_held_for_review' : 'ai_gateway_unavailable_low_value_approved',
        trustMultiplier: params.walletTrust.multiplier,
        flags,
      };
    }

    const aiVerdict = await aiVerifyAward({
      wallet: params.wallet.slice(0, 8) + '...',
      source: params.source,
      rawPoints: params.rawPoints,
      adjustedPoints,
      flags,
      trustLevel: params.walletTrust.level,
      trustScore: params.walletTrust.score,
      totalPointsToday: params.totalPointsToday,
      totalPointsAllTime: params.totalPointsAllTime,
      metadata: params.metadata,
    });

    if (aiVerdict.block) {
      holdForReview = true;
      adjustedPoints = 0;
      flags.push('ai_blocked');
    } else if (aiVerdict.reduce) {
      adjustedPoints = Math.round(adjustedPoints * aiVerdict.multiplier);
      flags.push(`ai_reduced_${(aiVerdict.multiplier * 100).toFixed(0)}pct`);
    }

    return {
      approved: !holdForReview,
      adjustedPoints,
      holdForReview,
      reason: aiVerdict.reason || flags.join(', '),
      trustMultiplier: params.walletTrust.multiplier,
      flags,
    };
  }

  // Clean award — no flags, no AI call needed
  return {
    approved: true,
    adjustedPoints,
    holdForReview: false,
    reason: 'clean',
    trustMultiplier: params.walletTrust.multiplier,
    flags: [],
  };
}

// Internal AI verification call — only triggered for suspicious/high-value awards
async function aiVerifyAward(params: {
  wallet: string;
  source: string;
  rawPoints: number;
  adjustedPoints: number;
  flags: string[];
  trustLevel: string;
  trustScore: number;
  totalPointsToday: number;
  totalPointsAllTime: number;
  metadata: Record<string, any>;
}): Promise<{ block: boolean; reduce: boolean; multiplier: number; reason: string }> {
  const prompt = `You are the GASCOIN points integrity system. Evaluate this point award and decide: approve, reduce, or block.

Wallet: ${params.wallet}
Source: ${params.source}
Raw points: ${params.rawPoints}
Adjusted points: ${params.adjustedPoints}
Flags: ${params.flags.join(', ') || 'none'}
Trust level: ${params.trustLevel} (score: ${params.trustScore}/100)
Points earned today: ${params.totalPointsToday}
Points all-time: ${params.totalPointsAllTime}

Return ONLY valid JSON:
{
  "block": false,
  "reduce": false,
  "multiplier": 1.0,
  "reason": "one sentence"
}

Rules:
- Block if: referral ring detected, clear bot farming, or trust score <15
- Reduce if: engagement looks inflated, new wallet earning too fast, or mild anomaly
- Approve if: activity patterns look normal for this trust level`;

  const response = await aiCall(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { block: false, reduce: false, multiplier: 1.0, reason: 'AI unavailable' };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      block: !!parsed.block,
      reduce: !!parsed.reduce,
      multiplier: Math.max(0.1, Math.min(1.0, Number(parsed.multiplier || 1.0))),
      reason: parsed.reason || '',
    };
  } catch (err) {
    silentLog(err, { module: 'ai-points-engine', operation: 'aiVerifyAward.parse', extra: { source: params.source } });
    return { block: false, reduce: false, multiplier: 1.0, reason: 'Parse error — defaulting to approve' };
  }
}

// ─── 6. WRITE VERIFIED POINTS ───
// Single function that all workers use to award points.
// Replaces direct supabase.from('engagement_points').insert() calls.

export async function awardVerifiedPoints(
  supabase: any,
  params: {
    wallet: string;
    source: 'tweet_engagement' | 'referral_conversion' | 'referral_passive' | 'submission_approved' | 'streak_bonus' | 'holdings_bonus';
    rawPoints: number;
    metadata: Record<string, any>;
    walletTrust: WalletTrustScore;
    tweetQuality?: TweetQualityScore;
    ringDetection?: RingDetectionResult;
    /**
     * Pre-aggregated point totals for this wallet. When supplied, the three
     * per-award SELECTs are skipped — callers in a loop (workers) must
     * pre-compute these in a single batch query to avoid an N+1 storm.
     */
    precomputedTotals?: { today: number; allTime: number; month: number };
  }
): Promise<{ awarded: boolean; points: number; heldForReview: boolean; reason: string }> {
  const todayKey = new Date().toISOString().split('T')[0];

  let totalPointsToday: number;
  let totalPointsAllTime: number;
  // Monthly total is only needed for the tweet_engagement cap below. We
  // carry it through the outer scope so it can be reused without another query.
  let totalPointsMonthPrecomputed: number | null = null;

  if (params.precomputedTotals) {
    totalPointsToday = params.precomputedTotals.today;
    totalPointsAllTime = params.precomputedTotals.allTime;
    totalPointsMonthPrecomputed = params.precomputedTotals.month;
  } else {
    const { data: todayEntries } = await supabase
      .from('engagement_points')
      .select('points')
      .eq('wallet', params.wallet)
      .gte('created_at', `${todayKey}T00:00:00Z`);
    totalPointsToday = (todayEntries || []).reduce((s: number, e: any) => s + Number(e.points || 0), 0);

    // Server-side SUM aggregate — avoids pulling every engagement_points row
    // for a wallet just to add them up. Falls back to row fetch if the
    // aggregate path errors (older supabase-js or missing column alias).
    const { data: sumRows, error: sumErr } = await supabase
      .from('engagement_points')
      .select('points.sum()')
      .eq('wallet', params.wallet);
    if (sumErr || !sumRows) {
      const { data: allTimeEntries } = await supabase
        .from('engagement_points')
        .select('points')
        .eq('wallet', params.wallet);
      totalPointsAllTime = (allTimeEntries || []).reduce((s: number, e: any) => s + Number(e.points || 0), 0);
    } else {
      totalPointsAllTime = Number((sumRows as any[])[0]?.sum || 0);
    }
  }

  // Run pre-award verification
  const verification = await verifyPointAward({
    wallet: params.wallet,
    source: params.source,
    rawPoints: params.rawPoints,
    metadata: params.metadata,
    walletTrust: params.walletTrust,
    tweetQuality: params.tweetQuality,
    ringDetection: params.ringDetection,
    totalPointsToday,
    totalPointsAllTime,
  });

  if (verification.holdForReview) {
    // Write to pending_points table for admin review
    await supabase.from('engagement_points').insert({
      wallet: params.wallet,
      source: `pending_${params.source}`,
      points: verification.adjustedPoints,
      metadata_json: {
        ...params.metadata,
        verification,
        original_points: params.rawPoints,
        held_reason: verification.reason,
        held_at: new Date().toISOString(),
      },
    });

    return { awarded: false, points: 0, heldForReview: true, reason: verification.reason };
  }

  if (verification.adjustedPoints <= 0) {
    return { awarded: false, points: 0, heldForReview: false, reason: verification.reason };
  }

  // ─── Enforce daily/monthly engagement caps ───
  if (params.source === 'tweet_engagement') {
    const { POINTS_CONFIG } = await import('./engagement-rewards');
    if (totalPointsToday + verification.adjustedPoints > POINTS_CONFIG.MAX_ENGAGEMENT_POINTS_PER_DAY) {
      const remaining = Math.max(0, POINTS_CONFIG.MAX_ENGAGEMENT_POINTS_PER_DAY - totalPointsToday);
      if (remaining <= 0) {
        return { awarded: false, points: 0, heldForReview: false, reason: 'daily_engagement_cap_reached' };
      }
      verification.adjustedPoints = remaining;
    }

    // Monthly cap
    let totalPointsMonth: number;
    if (totalPointsMonthPrecomputed !== null) {
      totalPointsMonth = totalPointsMonthPrecomputed;
    } else {
      const monthStart = `${todayKey.slice(0, 7)}-01T00:00:00Z`;
      const { data: monthEntries } = await supabase
        .from('engagement_points')
        .select('points')
        .eq('wallet', params.wallet)
        .eq('source', 'tweet_engagement')
        .gte('created_at', monthStart);
      totalPointsMonth = (monthEntries || []).reduce((s: number, e: any) => s + Number(e.points || 0), 0);
    }
    if (totalPointsMonth + verification.adjustedPoints > POINTS_CONFIG.MAX_ENGAGEMENT_POINTS_PER_MONTH) {
      const remaining = Math.max(0, POINTS_CONFIG.MAX_ENGAGEMENT_POINTS_PER_MONTH - totalPointsMonth);
      if (remaining <= 0) {
        return { awarded: false, points: 0, heldForReview: false, reason: 'monthly_engagement_cap_reached' };
      }
      verification.adjustedPoints = remaining;
    }
  }

  // Write verified points
  // Season 1 beta mode: tag row with metadata.beta=true so leaderboard/composite
  // can exclude beta activity from public rankings at launch. Source strings are
  // kept unchanged so worker idempotency checks (.eq('source', 'submission_approved'))
  // continue to match.
  const isBetaMode = shouldTagPointsAsBeta();
  await supabase.from('engagement_points').insert({
    wallet: params.wallet,
    source: params.source,
    points: verification.adjustedPoints,
    metadata_json: {
      ...params.metadata,
      ...(isBetaMode ? { beta: true, beta_season: 'season_1' } : {}),
      verification: {
        approved: true,
        trustMultiplier: verification.trustMultiplier,
        adjustedFrom: params.rawPoints,
        flags: verification.flags,
      },
    },
  });

  return { awarded: true, points: verification.adjustedPoints, heldForReview: false, reason: 'verified' };
}

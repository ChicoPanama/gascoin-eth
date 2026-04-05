// ═══════════════════════════════════════════
// GASCOIN AI Points Engine
//
// AI layers that plug into the points system:
// 1. Tweet Quality Scorer — content analysis, bot detection
// 2. Referral Ring Detector — graph analysis, farming detection
// 3. Wallet Trust Scorer — behavioral reputation
// 4. Daily Audit Narrator — human-readable summaries
//
// All AI calls go through OpenRouter (Gemini Flash)
// Cost: ~$0.0001 per analysis
// ═══════════════════════════════════════════

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = process.env.RECEIPT_FRAUD_MODEL || 'google/gemini-2.0-flash-001';

async function aiCall(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return '';

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://platform-ebon-nine.vercel.app',
        'X-Title': 'GASCOIN Points Engine',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!res.ok) return '';
    const json = (await res.json()) as any;
    return json?.choices?.[0]?.message?.content?.trim() || '';
  } catch {
    return '';
  }
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
}): Promise<TweetQualityScore> {
  const { tweetText, impressions, likes, retweets, replies, followerCount } = params;

  // Heuristic pre-checks (free, instant)
  const wordCount = tweetText.split(/\s+/).length;
  const hashtagCount = (tweetText.match(/#/g) || []).length;
  const isOnlyHashtags = wordCount <= hashtagCount + 2;

  // Engagement ratio check — bot signal
  const engagementRate = followerCount > 0 ? (likes + retweets + replies) / followerCount : 0;
  const suspiciousEngagement = engagementRate > 5; // >500% engagement rate is suspicious

  // If obvious spam, skip AI call
  if (isOnlyHashtags) {
    return { quality: 0.1, isSpam: true, isBotEngagement: false, multiplier: 0.2, reason: 'Tweet is mostly hashtags with no meaningful content' };
  }

  if (suspiciousEngagement && followerCount < 100) {
    return { quality: 0.2, isSpam: false, isBotEngagement: true, multiplier: 0.3, reason: 'Engagement rate abnormally high relative to follower count' };
  }

  // AI quality assessment
  const prompt = `Rate this tweet's quality for a gas refund community platform. Return ONLY valid JSON.

Tweet: "${tweetText.slice(0, 280)}"
Metrics: ${impressions} impressions, ${likes} likes, ${retweets} RTs, ${replies} replies
Author followers: ${followerCount}

Score these (0-1 each):
{
  "quality": 0.0-1.0 (is this genuine, thoughtful content about gas prices/refunds?),
  "spam_probability": 0.0-1.0 (pure hashtag spam, copy-paste, no original thought?),
  "bot_engagement_probability": 0.0-1.0 (do the engagement numbers look artificial?),
  "reason": "one sentence explanation"
}`;

  const response = await aiCall(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { quality: 0.7, isSpam: false, isBotEngagement: false, multiplier: 1.0, reason: 'AI unavailable — default scoring' };

    const parsed = JSON.parse(jsonMatch[0]);
    const quality = Math.max(0, Math.min(1, Number(parsed.quality || 0.7)));
    const isSpam = Number(parsed.spam_probability || 0) > 0.6;
    const isBotEngagement = Number(parsed.bot_engagement_probability || 0) > 0.6;

    // Calculate multiplier: quality acts as a direct multiplier
    let multiplier = quality;
    if (isSpam) multiplier = Math.min(multiplier, 0.2);
    if (isBotEngagement) multiplier = Math.min(multiplier, 0.3);
    multiplier = Math.max(0.1, Math.min(1.5, multiplier)); // Floor 0.1, cap 1.5 for exceptional content

    return { quality, isSpam, isBotEngagement, multiplier, reason: parsed.reason || '' };
  } catch {
    return { quality: 0.7, isSpam: false, isBotEngagement: false, multiplier: 1.0, reason: 'Parse error — default scoring' };
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

  // Graph analysis (free, instant)

  // Check circular: A→B + B→A
  const directCircle = allReferrals.some(
    (r) => r.referrer === referredWallet && r.referred === referrerWallet
  );
  if (directCircle) {
    return { isSuspicious: true, ringType: 'circular', confidence: 0.95, wallets: [referrerWallet, referredWallet], reason: 'Direct circular referral: A referred B, B referred A' };
  }

  // Check 3-node cycle: A→B, B→C, C→A
  const bReferrals = allReferrals.filter((r) => r.referrer === referredWallet);
  for (const bRef of bReferrals) {
    const cReferrals = allReferrals.filter((r) => r.referrer === bRef.referred);
    if (cReferrals.some((r) => r.referred === referrerWallet)) {
      return {
        isSuspicious: true, ringType: 'circular', confidence: 0.9,
        wallets: [referrerWallet, referredWallet, bRef.referred],
        reason: `3-node cycle: ${referrerWallet.slice(0, 6)}→${referredWallet.slice(0, 6)}→${bRef.referred.slice(0, 6)}→back`,
      };
    }
  }

  // Check chain farming: referrer has >5 referrals all created within 24h
  const referrerRefs = allReferrals.filter((r) => r.referrer === referrerWallet);
  if (referrerRefs.length >= 5) {
    const timestamps = referrerRefs.map((r) => new Date(r.created_at).getTime()).sort();
    const span = timestamps[timestamps.length - 1] - timestamps[0];
    if (span < 24 * 3600000) {
      return {
        isSuspicious: true, ringType: 'chain', confidence: 0.8,
        wallets: [referrerWallet, ...referrerRefs.map((r) => r.referred)],
        reason: `${referrerRefs.length} referrals created within ${Math.round(span / 3600000)}h — possible farming`,
      };
    }
  }

  return { isSuspicious: false, ringType: 'none', confidence: 0, wallets: [], reason: '' };
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

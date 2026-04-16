/**
 * Public-facing gate documentation.
 *
 * THIS FILE MUST STAY ALIGNED WITH `lib/policy.ts`'s `GATE_DEFS` constant.
 * `lib/policy.ts` is the enforcement engine — the canonical source of truth.
 * `lib/gates.ts` is the documentation surface — what the /gates page renders.
 *
 * Rules:
 *  1. Every entry below MUST have a `policyGate` that exists as an `id` in
 *     `GATE_DEFS` in `lib/policy.ts`.
 *  2. The number of entries here MUST equal `GATE_COUNT` from `lib/policy.ts`
 *     (currently 14). The unit tests assert this.
 *  3. The order here is the user-facing display order on /gates and may
 *     differ from the policy evaluation order.
 *  4. When you add a gate to policy.ts, add the matching documentation entry
 *     here in the same PR.
 *
 * Drift between this file and policy.ts is exactly what caused the user's
 * "are we unilaterally aligned?" question. The unit test now enforces
 * alignment so it cannot drift again silently.
 */

import { GATE_DEFS } from './policy';

export interface GateDefinition {
  id: number;
  slug: string;
  /** The gate id value pushed by lib/policy.ts evaluateClaim() */
  policyGate: string;
  name: string;
  category: 'identity' | 'tweet' | 'receipt' | 'wallet' | 'treasury';
  description: string;
  what_we_check: string;
  common_failures: string[];
  how_to_pass: string;
  estimated_time_seconds: number;
  is_blocking: boolean;
  checklist_label: string;
}

export const GATES: GateDefinition[] = [
  // ─── IDENTITY (5) ──────────────────────────────────────────────
  {
    id: 1, slug: 'x-verified', policyGate: 'x_verified', name: 'X Verified', category: 'identity',
    description: 'Your X account must carry a verified checkmark — blue, business, or government.',
    what_we_check: 'X API v2 user lookup of verified_type. Any value other than "none" passes. Falls back to the legacy verified boolean if verified_type is unavailable.',
    common_failures: [
      'X Premium subscription lapsed',
      'Account temporarily restricted by X',
      'New account that has not yet been verified',
    ],
    how_to_pass: 'Have an active X Premium, business, or government verification on the X account you sign in with. Free unverified accounts cannot submit during Season 1 — this is a hard sybil-resistance requirement.',
    estimated_time_seconds: 4, is_blocking: true,
    checklist_label: 'My X account has a blue, business, or government checkmark',
  },
  {
    id: 2, slug: 'follows-gascoin', policyGate: 'follows_gascoin', name: 'Follows @GasCoinApp', category: 'identity',
    description: 'You must follow @GasCoinApp on X before your submission is accepted.',
    what_we_check: 'A cron-cached SET of @GasCoinApp follower X user IDs. SISMEMBER lookup against your authenticated X identity. The follower set is rebuilt every 30 minutes from the X API.',
    common_failures: [
      'Not following @GasCoinApp at the time of submission',
      'Follower cache cold and the synchronous fallback fails',
      'Followed @GasCoinApp less than ~30 minutes ago and the cache has not yet refreshed',
    ],
    how_to_pass: 'Visit https://x.com/GasCoinApp and tap Follow before submitting. If you just followed and the gate still fails, wait 60 seconds and resubmit — the cold-cache rebuild will fire on your second attempt.',
    estimated_time_seconds: 4, is_blocking: true,
    checklist_label: 'I follow @GasCoinApp on X',
  },
  {
    id: 3, slug: 'cooldown', policyGate: 'cooldown', name: 'Submission Cooldown', category: 'identity',
    description: 'Each X account has a tier-based cooldown between submissions. Standard/Commuter: 7 days. Road Warrior: 3.5 days. Fleet: 1.75 days.',
    what_we_check: 'Your X account is checked against all active claims within the cooldown window for your GASCOIN-holding tier. Cooldown is per X identity, not per wallet.',
    common_failures: [
      'Submitting again before the cooldown expires for your tier',
      'Trying a different wallet with the same X account',
      'A previous claim is still processing',
    ],
    how_to_pass: 'Wait for your tier-specific cooldown to expire. Check your cooldown status on the Tracker page before submitting.',
    estimated_time_seconds: 5, is_blocking: true,
    checklist_label: 'My cooldown has expired since my last submission',
  },
  {
    id: 4, slug: 'min-followers', policyGate: 'min_followers', name: 'Min 100 Followers', category: 'identity',
    description: 'Your X account must have at least 100 followers at the time of submission.',
    what_we_check: 'X API v2 public_metrics.followers_count fetched fresh per submission. Cached for 15 minutes per handle.',
    common_failures: [
      'Account under 100 followers',
      'Recent mass-unfollow drop below threshold',
      'Bought followers that were purged by X',
    ],
    how_to_pass: 'Grow your following organically. Real engagement on real content is the fastest path. Bot followers will be detected by the account quality gate even if the count check passes.',
    estimated_time_seconds: 4, is_blocking: true,
    checklist_label: 'My X account has at least 100 followers',
  },
  {
    id: 5, slug: 'account-quality', policyGate: 'account_quality', name: 'Account Quality', category: 'identity',
    description: 'The account must show signs of being a real person: profile bio, posting history, account age, and engagement patterns.',
    what_we_check: 'Composite score from account creation date, tweet frequency, profile completeness (bio, location, banner), follower-to-following ratio, and historical engagement consistency. Threshold tuned to filter bots and brand-new throwaway accounts.',
    common_failures: [
      'Account less than 30 days old',
      'No bio or default profile image',
      'Zero or near-zero historical posting activity',
      'Suspicious follower/following ratio',
    ],
    how_to_pass: 'Use a real X account that you actually use. Add a bio, post regularly, engage with your community. This gate is impossible to game with throwaway accounts.',
    estimated_time_seconds: 6, is_blocking: true,
    checklist_label: 'My X account has a bio, posting history, and is at least 30 days old',
  },

  // ─── TWEET (3) ─────────────────────────────────────────────────
  {
    id: 6, slug: 'tweet-hashtag', policyGate: 'tweet_hashtag', name: 'Tweet #gascoin / $GASCOIN', category: 'tweet',
    description: 'The tweet body must contain either the #gascoin hashtag OR the $GASCOIN cashtag (case-insensitive). $GASCOIN unlocks the X price chart overlay — recommended for max reach.',
    what_we_check: 'Case-insensitive regex `[#$]gascoin\\b` against the tweet text from the X API. Also matches the structured hashtags and cashtags entities if X populates them.',
    common_failures: [
      'Hashtag spelled incorrectly — #gasCoin, #gas_coin',
      'Hashtag embedded in a URL or another word',
      '#gascoin in a reply to your tweet, not in the original post',
      'Used a different cashtag like $GAS instead of $GASCOIN',
    ],
    how_to_pass: 'Type both #gascoin and $GASCOIN into your tweet, and tag @GasCoinApp. Either the hashtag or cashtag alone is enough to pass, the @GasCoinApp tag helps new users find the official profile, and $GASCOIN unlocks X\'s price chart overlay. Recommended move: include all three.',
    estimated_time_seconds: 3, is_blocking: true,
    checklist_label: 'My tweet contains #gascoin or $GASCOIN',
  },
  {
    id: 7, slug: 'tweet-mentions-gascoinapp', policyGate: 'tweet_mentions_gascoinapp', name: 'Tweet Tags @GasCoinApp', category: 'tweet',
    description: 'The tweet must tag @GasCoinApp so new readers can find the official profile and follow it. This is the primary organic growth vector for the brand.',
    what_we_check: 'Case-insensitive regex `@gascoinapp\\b` against the tweet text from the X API (primary) plus text-fallback check of the oEmbed HTML. The word boundary prevents false matches like @gascoinappbot.',
    common_failures: [
      'Forgot to type @GasCoinApp in the tweet',
      'Typed @gascoin instead of @GasCoinApp',
      'Tag embedded inside a URL or another word',
    ],
    how_to_pass: 'Type @GasCoinApp as a standalone token in your tweet. X autocomplete will suggest it — tap the suggestion so X links the mention as a proper profile tag, not just text.',
    estimated_time_seconds: 3, is_blocking: true,
    checklist_label: 'My tweet tags @GasCoinApp',
  },
  {
    id: 8, slug: 'tweet-live', policyGate: 'tweet_live', name: 'Tweet Live & Public', category: 'tweet',
    description: 'The tweet must be publicly visible at the time of verification — not deleted, not from a private account, not visibility-limited.',
    what_we_check: 'Tweet URL is fetched fresh via the X API. The tweet must exist, the author account must be public, and the tweet must not be flagged as visibility-limited.',
    common_failures: [
      'Tweet was deleted after submission',
      'Account was set to private after posting',
      'Tweet visibility limited to followers only',
      'Account was suspended after posting',
    ],
    how_to_pass: 'Keep your X account set to public. Do not delete the tweet until your refund is issued. Pre-payout verification re-checks this gate, so deletion at any time before payout will fail the claim.',
    estimated_time_seconds: 5, is_blocking: true,
    checklist_label: 'My X account and tweet are both public',
  },

  // ─── RECEIPT (5) ───────────────────────────────────────────────
  {
    id: 9, slug: 'receipt-hashtag', policyGate: 'receipt_hashtag', name: 'Receipt Hashtag', category: 'receipt',
    description: 'The receipt photo must include #gascoin written or visible somewhere in the image.',
    what_we_check: 'OCR scan of the uploaded receipt searches for the literal text "#gascoin" anywhere in the extracted text.',
    common_failures: [
      'Hashtag written too small to OCR',
      'Hashtag written in pencil or low-contrast ink',
      'Hashtag obscured by lighting or angle',
    ],
    how_to_pass: 'Write #gascoin clearly in dark pen on the receipt before photographing it. Same pen and same surface as your wallet last-4 — they are checked by the same OCR pass.',
    estimated_time_seconds: 12, is_blocking: true,
    checklist_label: '#gascoin is written on the receipt photo',
  },
  {
    id: 10, slug: 'wallet-match', policyGate: 'wallet_match', name: 'Wallet Match on Receipt', category: 'wallet',
    description: 'The last 4 characters of your connected Solana wallet must be written on the receipt and visible in the photo.',
    what_we_check: 'OCR extracts text from the receipt image and searches for the last 4 characters of your connected wallet (case-insensitive). The extracted characters must match exactly.',
    common_failures: [
      'Characters written too small or unclear',
      'Wrong 4 characters — typo or different wallet',
      'Photo taken at an angle that distorts the text',
      'Characters written on separate paper, not on the receipt',
    ],
    how_to_pass: 'Write the last 4 characters of your wallet address clearly in dark pen directly on the receipt. Write large enough to be readable in the photo.',
    estimated_time_seconds: 45, is_blocking: true,
    checklist_label: 'The last 4 characters of my wallet are written on the receipt',
  },
  {
    id: 11, slug: 'not-duplicate', policyGate: 'not_duplicate', name: 'Not a Duplicate', category: 'receipt',
    description: 'The same gas receipt may never be submitted twice regardless of which wallet uploads it.',
    what_we_check: 'Both an exact SHA-256 hash and a perceptual phash of the uploaded image are compared against every previously submitted receipt. Either match triggers a duplicate failure.',
    common_failures: [
      'Submitting the same receipt after a previous failure',
      'Two people submitting photos of the same receipt',
      'Photo of a photo of a receipt',
      'Lightly cropped or rotated version of an existing receipt',
    ],
    how_to_pass: 'Each submission requires a unique original gas receipt. Never resubmit a receipt that was previously used — even by another wallet.',
    estimated_time_seconds: 20, is_blocking: true,
    checklist_label: 'This specific receipt has never been submitted before',
  },
  {
    id: 12, slug: 'ai-image-check', policyGate: 'ai_image_check', name: 'Not AI-Generated', category: 'receipt',
    description: 'The receipt image must not be generated by an AI image model.',
    what_we_check: 'A vision model (Gemini) scores the image for AI-generation probability on a 0–1 scale. Scores at or above 0.65 fail. Lower is better.',
    common_failures: [
      'Image was generated by Midjourney, DALL-E, or another AI image model',
      'Heavily filtered or stylized photo that triggers the detector',
      'Photo of a screen displaying a receipt',
    ],
    how_to_pass: 'Photograph a real physical gas receipt with your phone camera. Do not use any AI image tools. Avoid heavy filters or post-processing.',
    estimated_time_seconds: 8, is_blocking: true,
    checklist_label: 'My receipt is a photo of a real physical receipt, not AI-generated',
  },
  {
    id: 13, slug: 'tamper-check', policyGate: 'tamper_check', name: 'Not Tampered', category: 'receipt',
    description: 'The receipt image must not show signs of digital manipulation — edited totals, pasted dates, photoshopped text.',
    what_we_check: 'Image forensics scoring on a 0–1 scale: edge inconsistencies, copy-move artifacts, double-JPEG compression patterns. Scores at or above 0.55 fail.',
    common_failures: [
      'Receipt was edited in Photoshop, Photopea, or similar',
      'Date or total was altered after the original photo',
      'Composite image — multiple receipts merged together',
    ],
    how_to_pass: 'Submit the original photo straight from your camera. Do not crop heavily, do not edit, do not enhance. Lightly correcting brightness is fine.',
    estimated_time_seconds: 10, is_blocking: true,
    checklist_label: 'My receipt photo is unedited and untampered',
  },
  {
    id: 14, slug: 'min-amount', policyGate: 'min_amount', name: 'Min $5 Receipt', category: 'receipt',
    description: 'The receipt total must be at least $5 USD to prevent streak/submission gaming with trivial purchases.',
    what_we_check: 'OCR-extracted total amount converted to USD via the receipt currency. Must be $5.00 or greater.',
    common_failures: [
      'Receipt total under $5',
      'OCR misread the total — small font, smudged ink',
      'Foreign currency conversion put the total below $5',
    ],
    how_to_pass: 'Submit a real gas fill-up of $5 or more. The threshold is intentionally low so motorcycles and small fills still qualify.',
    estimated_time_seconds: 5, is_blocking: true,
    checklist_label: 'My receipt total is at least $5 USD',
  },

  {
    id: 15, slug: 'receipt-date-valid', policyGate: 'receipt_date_valid', name: 'Receipt Date Valid', category: 'receipt',
    description: 'The gas purchase must have occurred within 7 days before your submission date.',
    what_we_check: 'Gemini Vision OCR extracts the printed date from the receipt. That date is compared against the submission timestamp. Future-dated receipts and receipts older than 7 days fail.',
    common_failures: [
      'Receipt older than 7 days from the submission date',
      'Date field obscured, folded, or illegible in the photo',
      'Photographed a receipt from a much earlier purchase',
    ],
    how_to_pass: 'Submit receipts from gas purchases made within the last 7 days. Photograph the receipt on the same day you buy gas.',
    estimated_time_seconds: 5, is_blocking: true,
    checklist_label: 'My gas purchase was made within the last 7 days',
  },
  {
    id: 16, slug: 'amount-verified', policyGate: 'amount_verified', name: 'OCR Amount Verified', category: 'receipt',
    description: 'The amount you claim must match what our AI reads on your receipt. You may not claim more than 125% of the printed total.',
    what_we_check: 'Gemini Vision extracts the receipt total. Your submitted amount is compared to that OCR-detected total. If you claim more than 25% above what the receipt shows, this gate fails.',
    common_failures: [
      'Entered an amount higher than what is printed on the receipt',
      'Receipt total was digitally altered before photographing',
      'OCR misread the total (small font, smudged) — resubmit with a clearer photo',
    ],
    how_to_pass: 'Enter the exact amount shown on your receipt. Do not round up or inflate the total.',
    estimated_time_seconds: 5, is_blocking: true,
    checklist_label: 'My claimed amount matches the printed total on my receipt',
  },

  // ─── WALLET (1) ────────────────────────────────────────────────
  {
    id: 17, slug: 'gascoin-min-hold', policyGate: 'gascoin_min_hold', name: 'GASCOIN Min Hold', category: 'wallet',
    description: 'Your connected wallet must hold at least 1 GASCOIN token at the time of submission. In Season 1 dry-run mode this gate is bypassed so testers can participate without holding the token.',
    what_we_check: 'On-chain SPL token balance of your connected wallet against the GASCOIN mint. During Season 1 (ENABLE_LIVE_PAYOUT=false) this check auto-passes.',
    common_failures: [
      'Wallet holds 0 GASCOIN tokens (live mode)',
      'Wallet holds GASCOIN on a different chain or in a centralized exchange',
      'Token mint address mismatch',
    ],
    how_to_pass: 'During Season 1 beta, no action required — this gate is bypassed. After token launch, hold at least 1 GASCOIN in your connected wallet.',
    estimated_time_seconds: 6, is_blocking: false,
    checklist_label: 'I hold at least 1 GASCOIN (or am submitting during Season 1 dry-run)',
  },
];

export const GATE_CATEGORIES = {
  identity: { label: 'Identity Verification', count: 5 },
  tweet:    { label: 'Tweet Verification',    count: 3 },
  receipt:  { label: 'Receipt Verification',  count: 7 },
  wallet:   { label: 'Wallet Verification',   count: 2 },
  treasury: { label: 'Treasury Check',        count: 0 }, // reserved for future
} as const;

// Defensive runtime check — if the editor accidentally drops a gate or
// adds one without the matching policy.ts update, this throws on import.
if (GATES.length !== GATE_DEFS.length) {
  // Wrapped in a thrown Error rather than console.warn so the build/test
  // layer surfaces the drift loudly. This is the safety net.
  throw new Error(
    `lib/gates.ts has ${GATES.length} entries but lib/policy.ts has ${GATE_DEFS.length} GATE_DEFS. ` +
    `These must stay in lock-step — see the comment at the top of lib/gates.ts.`,
  );
}

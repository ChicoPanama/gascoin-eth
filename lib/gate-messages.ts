export type GateMessage = {
  headline: string;
  fix: string;
};

export const GATE_MESSAGES: Record<string, GateMessage> = {
  x_verified: {
    headline: 'X account is not verified',
    fix: 'Only accounts with a verified blue checkmark can claim. Upgrade your X subscription and try again.',
  },
  follows_gascoin: {
    headline: 'Not following @GasCoinApp',
    fix: 'Follow @GasCoinApp on X, then resubmit.',
  },
  tweet_hashtag: {
    headline: 'Tweet is missing #gascoin or $GASCOIN',
    fix: 'Your tweet must include #gascoin or $GASCOIN. Post a new tweet with the tag, then resubmit.',
  },
  tweet_mentions_gascoinapp: {
    headline: 'Tweet doesn\'t tag @GasCoinApp',
    fix: 'Your tweet must mention @GasCoinApp. Post a new tweet with the tag included, then resubmit.',
  },
  tweet_live: {
    headline: 'Tweet not found or was deleted',
    fix: 'Make sure your tweet is public and hasn\'t been deleted. Copy the URL directly from X and resubmit.',
  },
  receipt_hashtag: {
    headline: 'Receipt is missing the required hashtag',
    fix: 'Write #gascoin on a new physical receipt, photograph it clearly, and resubmit.',
  },
  wallet_match: {
    headline: 'Wallet address not found on receipt',
    fix: 'The last 4 characters of your wallet must be written on the physical receipt. Write them legibly and resubmit with a new photo.',
  },
  gascoin_min_hold: {
    headline: 'Insufficient GASCOIN balance',
    fix: 'You need at least 1 GASCOIN token to submit a claim. Buy GASCOIN and try again after your balance updates.',
  },
  not_duplicate: {
    headline: 'This receipt has already been submitted',
    fix: 'Each receipt can only be submitted once. Submit a different gas receipt.',
  },
  ai_image_check: {
    headline: 'Receipt appears AI-generated',
    fix: 'Only photos of real, physical gas receipts are accepted. Take a fresh photo of an actual receipt and resubmit.',
  },
  tamper_check: {
    headline: 'Receipt appears altered or tampered',
    fix: 'Only unedited photos of real receipts are accepted. Take a fresh, unmodified photo and resubmit.',
  },
  cooldown: {
    headline: 'Submission cooldown is still active',
    fix: 'You submitted recently. Check your dashboard for your cooldown expiry time, then resubmit.',
  },
  min_amount: {
    headline: 'Receipt total is below $5',
    fix: 'Only gas purchases of $5 or more qualify for a refund. Submit a receipt for a larger purchase.',
  },
  min_followers: {
    headline: 'Fewer than 100 X followers',
    fix: 'Your X account needs at least 100 followers to participate. Grow your following and try again.',
  },
  account_quality: {
    headline: 'Account quality check failed',
    fix: 'Your X account didn\'t meet our quality standards. Make sure your profile is complete and your account activity is genuine.',
  },
  receipt_date_valid: {
    headline: 'Receipt date is too old',
    fix: 'Only receipts dated within the last 30 days are accepted. Submit a more recent gas receipt.',
  },
  amount_verified: {
    headline: 'Receipt amount couldn\'t be read',
    fix: 'The total amount on your receipt wasn\'t clearly visible. Retake the photo with better lighting and ensure the total is in frame.',
  },
};

export const API_ERROR_MESSAGES: Record<string, string> = {
  unauthorized_privy_session_required: 'Sign in required. Please sign in with your X account and try again.',
  rate_limited: 'Too many submissions. Please wait a moment and try again.',
  ai_capacity_limited: 'Our verification system is busy. Please try again in a minute.',
  invite_required: 'A Season 1 beta invite code is required to submit.',
  wallet_registered_to_another_account: 'This wallet is linked to a different X account.',
  wallet_mismatch_with_session: 'Your wallet changed mid-session. Reconnect your wallet and try again.',
  api_unavailable: 'Social verification is temporarily unavailable. Please try again in a few minutes.',
  user_banned: 'Your account has been suspended from GASCOIN.',
  submit_failed: 'Submission failed. Please try again.',
  idempotency_key_reused_with_different_payload: 'Duplicate submission detected with different data. Please resubmit.',
};

export function getGateMessage(gateId: string): GateMessage {
  return (
    GATE_MESSAGES[gateId] ?? {
      headline: `${gateId.replace(/_/g, ' ')} check failed`,
      fix: 'Review the submission requirements and resubmit.',
    }
  );
}

export function getApiErrorMessage(errorCode: string): string {
  return API_ERROR_MESSAGES[errorCode] ?? 'Something went wrong. Please try again.';
}

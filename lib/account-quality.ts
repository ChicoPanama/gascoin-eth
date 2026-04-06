import type { XUser } from './x-api';

/**
 * Account quality scorer — determines if an X account looks like a real person.
 * Uses signals from X API v2 user data to catch bots, purchased-follower accounts,
 * and freshly-created sybil accounts.
 *
 * Score range: 0–100. Minimum threshold for submission: 40.
 */

export interface AccountQualityResult {
  score: number;
  passed: boolean;
  flags: string[];
}

const MIN_ACCOUNT_QUALITY_SCORE = 40;

export function scoreAccountQuality(user: XUser): AccountQualityResult {
  let score = 50; // baseline
  const flags: string[] = [];
  const pm = user.public_metrics;

  // --- Account age ---
  if (user.created_at) {
    const ageDays = (Date.now() - new Date(user.created_at).getTime()) / 86400000;
    if (ageDays < 30) {
      score -= 25;
      flags.push('account_under_30_days');
    } else if (ageDays < 90) {
      score -= 10;
      flags.push('account_under_90_days');
    } else if (ageDays > 365) {
      score += 10;
    }
  } else {
    // No created_at available — slight penalty
    score -= 5;
  }

  // --- Follower/following ratio ---
  if (pm) {
    const followers = pm.followers_count || 0;
    const following = pm.following_count || 1;

    // Bots follow thousands but have few followers
    if (following > 0 && followers > 0 && following > followers * 10) {
      score -= 20;
      flags.push('suspicious_follow_ratio');
    }

    // Very low followers
    if (followers < 50) {
      score -= 15;
      flags.push('low_followers');
    } else if (followers < 100) {
      score -= 5;
    } else if (followers >= 500) {
      score += 5;
    }

    // --- Tweet count (posting history) ---
    const tweets = pm.tweet_count || 0;
    if (tweets < 10) {
      score -= 20;
      flags.push('almost_no_tweets');
    } else if (tweets < 50) {
      score -= 10;
      flags.push('low_tweet_count');
    } else if (tweets >= 200) {
      score += 5;
    }

    // --- Listed count (social proof) ---
    const listed = pm.listed_count || 0;
    if (listed > 0) {
      score += 10;
    } else {
      score -= 5;
      flags.push('never_listed');
    }
  } else {
    score -= 15;
    flags.push('no_public_metrics');
  }

  // --- Profile completeness ---
  if (!user.description || user.description.trim().length < 5) {
    score -= 10;
    flags.push('empty_bio');
  }

  if (!user.profile_image_url || user.profile_image_url.includes('default_profile')) {
    score -= 10;
    flags.push('default_avatar');
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: score >= MIN_ACCOUNT_QUALITY_SCORE,
    flags,
  };
}

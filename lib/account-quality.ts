import type { XUser } from './x-api';

/**
 * Account quality scorer — determines if an X account looks like a real person.
 * Uses signals from X API v2 user data + historical metrics to catch bots,
 * purchased-follower accounts, and freshly-created sybil accounts.
 *
 * Score range: 0–100. Minimum threshold for submission: 40.
 */

export interface AccountQualityResult {
  score: number;
  passed: boolean;
  flags: string[];
}

export interface HistoricalSignals {
  previousFollowerCount?: number | null;
  avgQualityScore?: number | null;
  isProtected?: boolean | null;
  ipCountry?: string | null;
  xLocation?: string | null;
  bio?: string | null;
  accountCreatedAt?: string | null;
}

const MIN_ACCOUNT_QUALITY_SCORE = 40;

export function scoreAccountQuality(user: XUser, history?: HistoricalSignals): AccountQualityResult {
  let score = 50; // baseline
  const flags: string[] = [];
  const pm = user.public_metrics;

  // --- Account age ---
  const createdAt = user.created_at || history?.accountCreatedAt;
  if (createdAt) {
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86400000;
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
    score -= 5;
  }

  // --- Follower/following ratio ---
  if (pm) {
    const followers = pm.followers_count || 0;
    const following = pm.following_count || 1;

    if (following > 0 && followers > 0 && following > followers * 10) {
      score -= 20;
      flags.push('suspicious_follow_ratio');
    }

    if (followers < 50) {
      score -= 15;
      flags.push('low_followers');
    } else if (followers < 100) {
      score -= 5;
    } else if (followers >= 500) {
      score += 5;
    }

    // --- Follower count anomaly (historical comparison) ---
    if (history?.previousFollowerCount != null && history.previousFollowerCount > 0) {
      const dropPct = (history.previousFollowerCount - followers) / history.previousFollowerCount;
      if (dropPct > 0.5) {
        // Lost 50%+ followers since last check — bought followers dumped
        score -= 20;
        flags.push(`follower_drop_${Math.round(dropPct * 100)}pct`);
      }
      const spikePct = (followers - history.previousFollowerCount) / history.previousFollowerCount;
      if (spikePct > 5 && followers < 5000) {
        // 5x+ follower spike on a small account — bot injection
        score -= 15;
        flags.push(`follower_spike_${Math.round(spikePct * 100)}pct`);
      }
    }

    // --- Tweet count ---
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

    // --- Listed count ---
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
  const bio = user.description || history?.bio || '';
  if (!bio || bio.trim().length < 5) {
    score -= 10;
    flags.push('empty_bio');
  }

  if (!user.profile_image_url || user.profile_image_url.includes('default_profile')) {
    score -= 10;
    flags.push('default_avatar');
  }

  // --- Protected account (went private after previous submission) ---
  if (history?.isProtected === true) {
    score -= 15;
    flags.push('account_went_private');
  }

  // --- Location consistency ---
  if (history?.ipCountry && history?.xLocation) {
    const loc = history.xLocation.toUpperCase();
    const ip = history.ipCountry.toUpperCase();
    // If X profile says "Lagos" but IP is "US" — not conclusive but note it
    // Simple check: if IP country code appears nowhere in location string
    const countryNames: Record<string, string[]> = {
      US: ['USA', 'UNITED STATES', 'AMERICA'],
      GB: ['UK', 'UNITED KINGDOM', 'ENGLAND', 'BRITAIN'],
      CA: ['CANADA'],
      AU: ['AUSTRALIA'],
      NG: ['NIGERIA', 'LAGOS', 'ABUJA'],
      IN: ['INDIA', 'MUMBAI', 'DELHI'],
      PH: ['PHILIPPINES', 'MANILA'],
    };
    const ipNames = countryNames[ip] || [ip];
    const locationMatchesIp = ipNames.some((n) => loc.includes(n));
    if (!locationMatchesIp && loc.length > 2) {
      // Location and IP don't obviously match — minor flag
      score -= 5;
      flags.push('location_ip_mismatch');
    }
  }

  // --- Tweet quality trend (from engagement scoring) ---
  if (history?.avgQualityScore != null) {
    if (history.avgQualityScore < 0.2) {
      // Consistently low quality tweets = likely bot/spam
      score -= 10;
      flags.push('low_quality_trend');
    } else if (history.avgQualityScore > 0.7) {
      // High quality engagement = real human
      score += 5;
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: score >= MIN_ACCOUNT_QUALITY_SCORE,
    flags,
  };
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  composeDashboardTweet,
  composePostApprovalTweet,
  buildReferralUrl,
  openShareIntent,
} from '../../lib/share-tweets';
import './viral-share-card.css';

interface NetworkImpact {
  referredUsers: number;
  networkSolSaved: number;
  networkUsdSaved: number;
  combinedSol: number;
  combinedUsd: number;
}

interface DashboardProps {
  variant: 'dashboard';
  networkImpact: NetworkImpact;
  referralCode: string;
}

interface PostApprovalProps {
  variant: 'post-approval';
  referralCode: string;
}

type Props = DashboardProps | PostApprovalProps;

const RECRUITER_THRESHOLD = 5;

export function ViralShareCard(props: Props) {
  const [copied, setCopied] = useState(false);

  const referralUrl = buildReferralUrl(props.referralCode);

  if (props.variant === 'post-approval') {
    const tweet = composePostApprovalTweet({ referralUrl });

    return (
      <div className="vsc-post-approval">
        <div className="vsc-post__headline">Invite Friends</div>
        <p className="vsc-post__text">
          Help your friends save on gas too. Share your referral link and earn 500 points per signup.
        </p>
        <div className="vsc-post__actions">
          <button
            type="button"
            className="vsc-share-btn"
            onClick={() => openShareIntent(tweet)}
          >
            Share on X
          </button>
          <Link href="/me" className="vsc-post__link">
            View My Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  // Dashboard variant
  const { networkImpact } = props;

  // Empty state — no referrals yet
  if (networkImpact.referredUsers === 0) {
    const copyCode = async () => {
      try {
        await navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    };

    const tweet = composePostApprovalTweet({ referralUrl });

    return (
      <div className="vsc-dashboard">
        <h2 className="vsc-title">Network Impact</h2>
        <div className="vsc-empty">
          <div className="vsc-empty__label">Your Referral Code</div>
          <div className="vsc-empty__code">{props.referralCode}</div>
          <div className="vsc-empty__label">Share it to see your network impact grow</div>
          <div className="vsc-empty__actions">
            <button type="button" className="vsc-copy-btn" onClick={copyCode}>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              type="button"
              className="vsc-share-btn"
              onClick={() => openShareIntent(tweet)}
            >
              Share on X
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active state — has referrals
  const tweet = composeDashboardTweet({
    networkUsd: networkImpact.networkUsdSaved,
    referredCount: networkImpact.referredUsers,
    referralUrl,
  });

  const remaining = RECRUITER_THRESHOLD - networkImpact.referredUsers;

  return (
    <div className="vsc-dashboard">
      <h2 className="vsc-title">Network Impact</h2>

      <div className="gc-stats">
        <div className="gc-stats-grid ud-stats-grid--3">
          <div className="gc-stat">
            <div className="gc-stat-label">People Referred</div>
            <div className="gc-stat-value">{networkImpact.referredUsers}</div>
            <div className="gc-stat-sub">approved</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Gas Saved</div>
            <div className="gc-stat-value">${Math.round(networkImpact.networkUsdSaved)}</div>
            <div className="gc-stat-sub">USD by your network</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Combined SOL</div>
            <div className="gc-stat-value">{networkImpact.combinedSol.toFixed(4)}</div>
            <div className="gc-stat-sub">you + referrals</div>
          </div>
        </div>
      </div>

      {remaining > 0 && (
        <div className="vsc-milestone">
          <strong>{remaining}</strong> more referral{remaining !== 1 ? 's' : ''} to unlock Recruiter status
        </div>
      )}

      <div className="vsc-share-bar">
        <span className="vsc-tweet-preview">{tweet.split('\n')[0]}</span>
        <button
          type="button"
          className="vsc-share-btn"
          onClick={() => openShareIntent(tweet)}
        >
          Share on X
        </button>
      </div>
    </div>
  );
}

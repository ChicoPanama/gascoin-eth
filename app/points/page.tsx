'use client';

import { Nav } from '../../components/Nav';
import { POINTS_CONFIG, getContentTypeMultiplier } from '../../lib/engagement-rewards';
import type { ContentType } from '../../lib/x-api';

const CONTENT_TYPES: { type: ContentType; label: string; icon: string }[] = [
  { type: 'original_video', label: 'Original Video', icon: '🎥' },
  { type: 'original_image', label: 'Original Image', icon: '📸' },
  { type: 'text_only', label: 'Text Post', icon: '💬' },
  { type: 'quote', label: 'Quote Tweet', icon: '🔁' },
  { type: 'has_external_link', label: 'External Link', icon: '🔗' },
  { type: 'repost', label: 'Repost', icon: '♻️' },
];

const ENGAGEMENT_ROWS = [
  { label: 'Quote Tweet', value: POINTS_CONFIG.POINTS_PER_QUOTE_TWEET },
  { label: 'Reply', value: POINTS_CONFIG.POINTS_PER_REPLY },
  { label: 'Bookmark', value: POINTS_CONFIG.POINTS_PER_BOOKMARK },
  { label: 'Retweet', value: POINTS_CONFIG.POINTS_PER_RETWEET },
  { label: 'Like', value: POINTS_CONFIG.POINTS_PER_LIKE },
  { label: 'Impression', value: POINTS_CONFIG.POINTS_PER_IMPRESSION },
];

const TIERS = [
  { name: 'Standard', min: '1', pts: POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD, cooldown: '7 days', refund: '0.10 SOL' },
  { name: 'Commuter', min: '100K', pts: POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER, cooldown: '7 days', refund: '0.25 SOL' },
  { name: 'Road Warrior', min: '5M', pts: POINTS_CONFIG.POINTS_PER_CYCLE_ROAD_WARRIOR, cooldown: '3.5 days', refund: '0.50 SOL' },
  { name: 'Fleet', min: '10M', pts: POINTS_CONFIG.POINTS_PER_CYCLE_FLEET, cooldown: '1.75 days', refund: '1.0 SOL' },
];

export default function PointsPage() {
  // Worked example values
  const videoReplies = 50;
  const videoLikes = 200;
  const videoMultiplier = getContentTypeMultiplier('original_video');
  const repostRetweets = 200;
  const repostMultiplier = getContentTypeMultiplier('repost');
  const videoPoints = Math.round((videoReplies * POINTS_CONFIG.POINTS_PER_REPLY + videoLikes * POINTS_CONFIG.POINTS_PER_LIKE) * videoMultiplier);
  const repostPoints = Math.round((repostRetweets * POINTS_CONFIG.POINTS_PER_RETWEET) * repostMultiplier);

  const maxMultiplier = getContentTypeMultiplier('original_video');

  return (
    <div className="container">
      <Nav />

      {/* Header */}
      <header className="pts-header">
        <div className="pts-eyebrow">POINTS SYSTEM</div>
        <h1 className="pts-title">Earn Points. Beat the Algorithm.</h1>
        <p className="pts-subtitle">
          Your points drive your leaderboard rank. X rewards original content — so do we. Here&apos;s how to maximize both.
        </p>
      </header>

      {/* Section 1: What X Rewards */}
      <section className="pts-section">
        <h2 className="pts-section-title">What X Rewards</h2>
        <div className="pts-do-dont">
          <div className="pts-do">
            <div className="pts-do-label">DO — Maximum Reach &amp; Points</div>
            <ul className="pts-list">
              <li>Record original video with your voiceover ({videoMultiplier}x points)</li>
              <li>Share your real gas receipt story at the pump</li>
              <li>Create original images and photos ({getContentTypeMultiplier('original_image')}x points)</li>
              <li>Write genuine text posts with your own take</li>
            </ul>
          </div>
          <div className="pts-dont">
            <div className="pts-dont-label">DON&apos;T — Crushed by the Algorithm</div>
            <ul className="pts-list">
              <li>Repost other people&apos;s content ({repostMultiplier}x points, 90% impression loss)</li>
              <li>Cross-post from other platforms (third-party content)</li>
              <li>Paste external links ({getContentTypeMultiplier('has_external_link')}x points, deprioritized)</li>
              <li>Spam hashtags on unrelated content (AI flags it)</li>
              <li>Use clickbait bait (X assigns permanent deductions)</li>
            </ul>
          </div>
        </div>
        <div className="pts-callout">
          X is building tools to identify original creators and reward them with revenue sharing. Create original #gascoin content and you&apos;re building toward X payouts too.
        </div>
      </section>

      {/* Section 2: Content Type Multipliers */}
      <section className="pts-section">
        <h2 className="pts-section-title">Content Type Multipliers</h2>
        <div className="pts-multiplier-grid">
          {CONTENT_TYPES.map(({ type, label, icon }) => {
            const mult = getContentTypeMultiplier(type);
            const pct = (mult / maxMultiplier) * 100;
            return (
              <div key={type} className="pts-mult-row">
                <span className="pts-mult-icon">{icon}</span>
                <span className="pts-mult-label">{label}</span>
                <div className="pts-mult-bar-track">
                  <div className="pts-mult-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="pts-mult-value">{mult}x</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Engagement Points */}
      <section className="pts-section">
        <h2 className="pts-section-title">Engagement Points</h2>
        <p className="pts-section-desc">
          We weight engagement that X&apos;s algorithm rewards — replies, bookmarks, and quotes earn the most because they signal real interest. Likes and retweets are passive and worth less.
        </p>
        <div className="pts-table-wrap">
          <table className="pts-table">
            <thead>
              <tr><th>Action</th><th>Points</th></tr>
            </thead>
            <tbody>
              {ENGAGEMENT_ROWS.map((r) => (
                <tr key={r.label}><td>{r.label}</td><td>{r.value.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pts-callout">
          Caps: {POINTS_CONFIG.MAX_POINTS_PER_TWEET.toLocaleString()} pts max per tweet · {POINTS_CONFIG.MAX_ENGAGEMENT_POINTS_PER_DAY.toLocaleString()} pts max per day · {POINTS_CONFIG.MAX_ENGAGEMENT_POINTS_PER_MONTH.toLocaleString()} pts max per month. Consistent daily content beats one viral moment.
        </div>
        <div className="pts-example">
          <div className="pts-example-label">Example</div>
          <p>
            Your original video gets 15 replies and 50 likes: (15 × {POINTS_CONFIG.POINTS_PER_REPLY} + 50 × {POINTS_CONFIG.POINTS_PER_LIKE}) × {videoMultiplier} = <strong>{Math.min(Math.round((15 * POINTS_CONFIG.POINTS_PER_REPLY + 50 * POINTS_CONFIG.POINTS_PER_LIKE) * videoMultiplier), POINTS_CONFIG.MAX_POINTS_PER_TWEET).toLocaleString()} points</strong> (capped at {POINTS_CONFIG.MAX_POINTS_PER_TWEET.toLocaleString()}).
          </p>
          <p>
            A repost gets {repostRetweets} retweets: ({repostRetweets} × {POINTS_CONFIG.POINTS_PER_RETWEET}) × {repostMultiplier} = <strong>{repostPoints.toLocaleString()} points</strong>. Create, don&apos;t repost.
          </p>
        </div>
      </section>

      {/* Section 4: Other Ways to Earn */}
      <section className="pts-section">
        <h2 className="pts-section-title">Other Ways to Earn</h2>
        <div className="pts-table-wrap">
          <table className="pts-table">
            <thead>
              <tr><th>Action</th><th>Points</th></tr>
            </thead>
            <tbody>
              <tr><td>Submit a gas receipt (approved)</td><td>{POINTS_CONFIG.POINTS_PER_APPROVED_SUBMISSION.toLocaleString()}</td></tr>
              <tr><td>Refer a friend (welcome bonus)</td><td>{POINTS_CONFIG.REFERRAL_WELCOME_BONUS}</td></tr>
              <tr><td>Referral passive income (2% of referred users&apos; points)</td><td>Up to {POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY.toLocaleString()}/month</td></tr>
              <tr><td>Submission streak (per 30-day window, max {POINTS_CONFIG.MAX_STREAK_MULTIPLIER}x)</td><td>{POINTS_CONFIG.POINTS_PER_STREAK_WINDOW.toLocaleString()}</td></tr>
              <tr><td>Hold GASCOIN (daily bonus by tier)</td><td>{POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD.toLocaleString()}–{POINTS_CONFIG.POINTS_PER_CYCLE_FLEET.toLocaleString()}/day</td></tr>
            </tbody>
          </table>
        </div>
        <div className="pts-callout">
          Referral passive income rewards quality over quantity. You earn 2% of all points your referred users earn — but only while they&apos;re active. Refer real creators, not bots.
        </div>
      </section>

      {/* Section 5: Holdings Tiers */}
      <section className="pts-section">
        <h2 className="pts-section-title">Holdings Tiers</h2>
        <div className="pts-table-wrap">
          <table className="pts-table">
            <thead>
              <tr><th>Tier</th><th>Min Tokens</th><th>Points/Day</th><th>Cooldown</th><th>Max Refund</th></tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.name}>
                  <td>{t.name}</td>
                  <td>{t.min}</td>
                  <td>{t.pts}</td>
                  <td>{t.cooldown}</td>
                  <td>{t.refund}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 6: Quality & Trust */}
      <section className="pts-section">
        <h2 className="pts-section-title">Quality &amp; Trust</h2>
        <p className="pts-section-desc">
          We use AI to score your tweet quality. Genuine, original content about GASCOIN earns up to 1.5x bonus. Spam, bot engagement, and hashtag-stuffing get penalized (0.1–0.3x). Your wallet builds a trust score over time — veterans with clean records earn 1.2x on everything.
        </p>
      </section>

      {/* Section 7: Leaderboard */}
      <section className="pts-section">
        <h2 className="pts-section-title">Leaderboard Ranking</h2>
        <p className="pts-section-desc">
          Your leaderboard rank is based on a composite score weighted toward long-term commitment:
        </p>
        <div className="pts-table-wrap">
          <table className="pts-table">
            <thead>
              <tr><th>Category</th><th>Weight</th></tr>
            </thead>
            <tbody>
              <tr><td>Holdings bonus points (daily reward for holding GASCOIN)</td><td>55%</td></tr>
              <tr><td>Engagement points (tweets, submissions, streaks, referral passive)</td><td>25%</td></tr>
              <tr><td>Referral points (welcome bonuses from verified conversions)</td><td>20%</td></tr>
            </tbody>
          </table>
        </div>
        <div className="pts-callout">
          Holding GASCOIN is the strongest signal. Whales who also create content and refer users are untouchable on the leaderboard.
        </div>
      </section>
    </div>
  );
}

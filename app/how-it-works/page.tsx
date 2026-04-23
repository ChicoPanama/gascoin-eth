import Link from 'next/link';
import { Nav } from '../../components/Nav';
import { GATE_COUNT } from '../../lib/policy';
import { POINTS_CONFIG, getContentTypeMultiplier } from '../../lib/engagement-rewards';
import type { ContentType } from '../../lib/x-api';

// ─── Points reference data (merged from /points, 308-redirected) ───

const POINTS_CONTENT_TYPES: { type: ContentType; label: string }[] = [
  { type: 'original_video', label: 'Original Video' },
  { type: 'original_image', label: 'Original Image' },
  { type: 'text_only', label: 'Text Post' },
  { type: 'quote', label: 'Quote Tweet' },
  { type: 'has_external_link', label: 'External Link' },
  { type: 'repost', label: 'Repost' },
];

const POINTS_ENGAGEMENT_ROWS = [
  { label: 'Quote Tweet', value: POINTS_CONFIG.POINTS_PER_QUOTE_TWEET },
  { label: 'Reply', value: POINTS_CONFIG.POINTS_PER_REPLY },
  { label: 'Bookmark', value: POINTS_CONFIG.POINTS_PER_BOOKMARK },
  { label: 'Retweet', value: POINTS_CONFIG.POINTS_PER_RETWEET },
  { label: 'Like', value: POINTS_CONFIG.POINTS_PER_LIKE },
  { label: 'Impression', value: POINTS_CONFIG.POINTS_PER_IMPRESSION },
];

const POINTS_TIERS = [
  { name: 'Standard',     min: '1',    pts: POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD,     cooldown: '7 days',    refund: '0.004 ETH' },
  { name: 'Commuter',     min: '100K', pts: POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER,     cooldown: '7 days',    refund: '0.01 ETH'  },
  { name: 'Road Warrior', min: '5M',   pts: POINTS_CONFIG.POINTS_PER_CYCLE_ROAD_WARRIOR, cooldown: '3.5 days',  refund: '0.02 ETH'  },
  { name: 'Fleet',        min: '10M',  pts: POINTS_CONFIG.POINTS_PER_CYCLE_FLEET,        cooldown: '1.75 days', refund: '0.04 ETH'  },
];

type StepLink = { name: string; url: string; icon: string };
type Step = {
  number: number;
  title: string;
  time?: string;
  subtitle?: string;
  body?: string;
  bullets: string[];
  links?: StepLink[];
};

function brand(name: string) {
  return `/icons/brands/${name}.svg`;
}

const STEPS: Step[] = [
  {
    number: 0,
    title: 'What is GASCOIN?',
    body: 'You buy gas at any gas station. You post proof on X. You get real money sent to your digital wallet. No catch. No middlemen. Funded by the GASCOIN community treasury on Ethereum.',
    bullets: [],
  },
  {
    number: 1,
    title: 'Set Up an Ethereum Wallet',
    time: '5 min',
    bullets: [
      'Download MetaMask, Rabby, Rainbow, or Coinbase Wallet — free app for your phone or browser. Think of it like Venmo, but for crypto.',
      'Create your wallet. It gives you a "seed phrase" (12 words). Write these down on paper and keep them safe. Never share them with anyone.',
      'Your wallet address starts with 0x and is 42 characters long — like a bank account number. It\'s safe to share.',
    ],
    links: [
      { name: 'MetaMask', url: 'https://metamask.io', icon: brand('metamask') },
      { name: 'Rabby', url: 'https://rabby.io', icon: brand('rabby') },
      { name: 'Rainbow', url: 'https://rainbow.me', icon: brand('rainbow') },
      { name: 'Coinbase Wallet', url: 'https://www.coinbase.com/wallet', icon: brand('coinbase') },
    ],
  },
  {
    number: 2,
    title: 'Set Up X (Twitter)',
    time: '2 min',
    bullets: [
      'Your X account must be verified (blue/business/government checkmark). Unverified accounts are rejected at submission to prevent sybil attacks.',
      'You must follow @GasCoinApp on X before submitting. Claims from non-followers are rejected at the gate.',
      'You need a public X account with at least 100 followers.',
      'Your profile needs a bio and some posting history — brand new or empty accounts won\'t pass verification.',
      'Private accounts don\'t work. The system needs to see your tweet publicly.',
    ],
    links: [
      { name: 'X.com', url: 'https://x.com', icon: brand('x') },
    ],
  },
  {
    number: 3,
    title: 'Get ETH',
    time: '5 min',
    bullets: [
      'ETH is the native currency of Ethereum — you need it to buy GASCOIN tokens and pay gas (transaction) fees.',
      'You can buy ETH directly inside MetaMask or Coinbase Wallet with a debit card — easiest option for beginners.',
      'Or buy ETH on an exchange and send it to your wallet address (starts with 0x).',
      'Moonpay also lets you buy ETH with a card and send it straight to your wallet.',
    ],
    links: [
      { name: 'Coinbase', url: 'https://www.coinbase.com', icon: brand('coinbase') },
      { name: 'Binance', url: 'https://www.binance.com', icon: brand('binance') },
      { name: 'Kraken', url: 'https://www.kraken.com', icon: brand('kraken') },
      { name: 'Bybit', url: 'https://www.bybit.com', icon: brand('bybit') },
      { name: 'OKX', url: 'https://www.okx.com', icon: brand('okx') },
      { name: 'Moonpay', url: 'https://www.moonpay.com', icon: brand('moonpay') },
    ],
  },
  {
    number: 4,
    title: 'Get GASCOIN Tokens',
    time: '3 min',
    bullets: [
      'You need to hold at least 1 GASCOIN token in your Ethereum wallet before you can submit.',
      'Swap some ETH for GASCOIN on an Ethereum DEX like Uniswap or 1inch — search for the GASCOIN token contract.',
      'Holding more GASCOIN unlocks higher tiers with bigger refund caps and faster queue priority.',
    ],
    links: [
      { name: 'Uniswap', url: 'https://app.uniswap.org', icon: brand('uniswap') },
      { name: '1inch', url: 'https://app.1inch.io', icon: brand('1inch') },
      { name: 'CowSwap', url: 'https://swap.cow.fi', icon: brand('cowswap') },
    ],
  },
  {
    number: 5,
    title: 'Buy Gas',
    bullets: [
      'Fill up at any gas station — anywhere in the world.',
      'Ask for a paper receipt. Digital receipts, email receipts, and app receipts are not accepted.',
      'Keep the receipt. You\'ll photograph it in a few minutes.',
    ],
  },
  {
    number: 6,
    title: 'Write on Your Receipt',
    time: '30 sec',
    bullets: [
      'Open your wallet and copy your address (e.g. 0x742d35Cc6634C0532925a3b844Bc454e4438f44e).',
      'Write the LAST 4 hex characters of your wallet address on the receipt with a black pen.',
      'Write them big and clear — the system uses a camera to read them automatically.',
      'Example: if your wallet ends in "a3F2", write a3F2 on the receipt.',
    ],
    links: [
      { name: 'MetaMask', url: 'https://metamask.io', icon: brand('metamask') },
    ],
  },
  {
    number: 7,
    title: 'Post on X',
    time: '1 min',
    bullets: [
      'Post a tweet on X that tags @GasCoinApp and includes both #gascoin (hashtag) and $GASCOIN (cashtag). The @GasCoinApp tag helps new users find the official profile. The $GASCOIN cashtag unlocks X\'s price chart overlay on your post. Either tag/hashtag/cashtag alone is enough to pass the gate — all three together is the recommended move.',
      'Original videos earn 3x points — record yourself, share your story, show your receipt at the pump. Reposts earn almost nothing.',
      'Keep the tweet up. If you delete it, your submission will fail verification.',
      'Copy the URL of your tweet — you\'ll paste it in the next step.',
    ],
    links: [
      { name: 'Post on X', url: 'https://x.com/compose/post', icon: brand('x') },
    ],
  },
  {
    number: 8,
    title: 'Submit on GASCOIN',
    time: '3 min',
    bullets: [
      'Go to the Submit page on GASCOIN.',
      'Click "Connect Wallet" and connect your Ethereum wallet.',
      'Sign in with your X account.',
      'Paste your tweet URL.',
      'Upload a clear photo of your receipt (with the last 4 hex characters of your Ethereum wallet address visible, e.g. a3F2).',
      'Check the 3 confirmation boxes and hit Submit.',
    ],
    links: [
      { name: 'Submit Receipt', url: '/submit', icon: '/logo/gascoin-g.jpg' },
      { name: `View All ${GATE_COUNT} Gates`, url: '/gates', icon: '/logo/gascoin-g.jpg' },
    ],
  },
  {
    number: 9,
    title: 'Wait for Verification',
    bullets: [
      `The system automatically runs ${GATE_COUNT} verification checks on your submission. This takes 2-5 minutes.`,
      'If all checks pass, an admin reviews your submission and approves it.',
      'ETH is sent directly to your wallet within 24-48 hours — viewable on Etherscan.',
      'You can track your submission status on the Tracker page.',
    ],
    links: [
      { name: 'Track Status', url: '/wallet', icon: '/logo/gascoin-g.jpg' },
    ],
  },
  {
    number: 10,
    title: 'Cash Out',
    subtitle: 'Optional',
    bullets: [
      'Your ETH is already in your wallet — you can hold it, spend it, or convert it to dollars.',
      'Send ETH to an exchange and sell it for USD, EUR, or your local currency.',
      'Or use Moonpay to send it directly to your bank account.',
      'You can submit again after 7 days with a new receipt.',
    ],
    links: [
      { name: 'Coinbase', url: 'https://www.coinbase.com', icon: brand('coinbase') },
      { name: 'Binance', url: 'https://www.binance.com', icon: brand('binance') },
      { name: 'Bybit', url: 'https://www.bybit.com', icon: brand('bybit') },
      { name: 'OKX', url: 'https://www.okx.com', icon: brand('okx') },
      { name: 'Bitget', url: 'https://www.bitget.com', icon: brand('bitget') },
      { name: 'Gate.io', url: 'https://www.gate.io', icon: brand('gate') },
      { name: 'MEXC', url: 'https://www.mexc.com', icon: brand('mexc') },
      { name: 'Kraken', url: 'https://www.kraken.com', icon: brand('kraken') },
      { name: 'Moonpay', url: 'https://www.moonpay.com', icon: brand('moonpay') },
    ],
  },
];

function StepIcons({ links }: { links: StepLink[] }) {
  return (
    <div className="hiw-icons">
      {links.map((link) => {
        const isExternal = link.url.startsWith('http');
        const Tag = isExternal ? 'a' : Link;
        const props = isExternal
          ? { href: link.url, target: '_blank', rel: 'noopener noreferrer' }
          : { href: link.url };
        return (
          <Tag key={link.name} className="hiw-icon-cell" {...(props as any)} title={link.name}>
            <span className="hiw-icon-circle">
              <img src={link.icon} alt={link.name} className="hiw-icon-img" />
            </span>
            <span className="hiw-icon-label">{link.name}</span>
          </Tag>
        );
      })}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="container">
      <Nav />

      <header className="lb-header hiw-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— Step-by-Step Guide · From Zero to Refund</span>
        </div>
        <h1 className="lb-title lb-title--iconed">
          <span className="lb-title-icon-wrap" aria-hidden>
            <img src="/icons/how-it-works-pump.jpg" alt="" className="lb-title-icon" />
          </span>
          HOW IT WORKS
        </h1>
        <p className="hiw-subtitle">
          A complete guide from zero to getting paid back for gas.
          No crypto experience needed.
        </p>
      </header>

      <div className="hiw-steps">
        {STEPS.map((step) => (
          <div key={step.number} className="hiw-step">
            <div className="hiw-step-number">{step.number}</div>
            <div className="hiw-step-content">
              <h2>
                {step.title}
                {step.time && <span className="hiw-step-time">{step.time}</span>}
                {step.subtitle && <span className="hiw-step-badge">{step.subtitle}</span>}
              </h2>
              {step.body && <p className="hiw-step-body">{step.body}</p>}
              {step.bullets.length > 0 && (
                <ul>
                  {step.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
            {step.links && step.links.length > 0 && <StepIcons links={step.links} />}
          </div>
        ))}
      </div>

      {/* ── Points reference (merged from /points) ───────────────────── */}
      <PointsReference />

      <div className="hiw-cta">
        <Link href="/submit" className="gc-btn-solid">Start Submitting</Link>
        <Link href="/docs" className="gc-btn-ghost">Read the Full Docs</Link>
      </div>
    </div>
  );
}

// ─── Points reference section ──────────────────────────────────────
// Merged from the former /points page. Anchor `#points` is preserved so
// legacy share links like `/points` → 308 → `/how-it-works#points` land
// on the right section.

function PointsReference() {
  const videoMultiplier = getContentTypeMultiplier('original_video');
  const repostMultiplier = getContentTypeMultiplier('repost');
  const maxMultiplier = videoMultiplier;

  return (
    <section id="points" style={{ marginTop: 96, marginBottom: 48 }}>
      <header className="lb-header" style={{ marginBottom: 32 }}>
        <div className="lb-header__meta">
          <span className="lb-tag">— Points System · Beat the Algorithm</span>
        </div>
        <h2 className="lb-title" style={{ fontSize: 48, margin: 0 }}>POINTS</h2>
        <p className="gt-header-body">
          Your points drive your leaderboard rank. X rewards original content — so do we. Here&apos;s how to maximize both.
        </p>
      </header>

      {/* 1. What X Rewards */}
      <div className="pts-heading" style={{ marginBottom: 16 }}>What X Rewards</div>
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

      {/* 2. Content Type Multipliers */}
      <div className="pts-heading" style={{ marginTop: 64, marginBottom: 16 }}>Content Type Multipliers</div>
      <div className="pts-multiplier-grid">
        {POINTS_CONTENT_TYPES.map(({ type, label }) => {
          const mult = getContentTypeMultiplier(type);
          const pct = (mult / maxMultiplier) * 100;
          return (
            <div key={type} className="pts-mult-row">
              <span className="pts-mult-label">{label}</span>
              <div className="pts-mult-bar-track">
                <div className="pts-mult-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="pts-mult-value">{mult}x</span>
            </div>
          );
        })}
      </div>

      {/* 3. Engagement Points */}
      <div className="pts-heading" style={{ marginTop: 64, marginBottom: 16 }}>Engagement Points</div>
      <p className="gt-header-body" style={{ marginBottom: 24 }}>
        We weight engagement that X&apos;s algorithm rewards — replies, bookmarks, and quotes earn the most because they signal real interest. Likes and retweets are passive and worth less.
      </p>
      <table className="pts-table">
        <thead>
          <tr><th>Action</th><th>Points</th></tr>
        </thead>
        <tbody>
          {POINTS_ENGAGEMENT_ROWS.map((r) => (
            <tr key={r.label}><td>{r.label}</td><td>{r.value.toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="pts-callout" style={{ marginTop: 24 }}>
        Caps: {POINTS_CONFIG.MAX_POINTS_PER_TWEET.toLocaleString()} pts max per tweet · {POINTS_CONFIG.MAX_ENGAGEMENT_POINTS_PER_DAY.toLocaleString()} pts max per day · {POINTS_CONFIG.MAX_ENGAGEMENT_POINTS_PER_MONTH.toLocaleString()} pts max per month. Consistent daily content beats one viral moment.
      </div>

      {/* 4. Other Ways to Earn */}
      <div className="pts-heading" style={{ marginTop: 64, marginBottom: 16 }}>Other Ways to Earn</div>
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
      <div className="pts-callout" style={{ marginTop: 24 }}>
        Referral passive income rewards quality over quantity. You earn 2% of all points your referred users earn — but only while they&apos;re active. Refer real creators, not bots.
      </div>

      {/* 5. Holdings Tiers */}
      <div className="pts-heading" style={{ marginTop: 64, marginBottom: 16 }}>Holdings Tiers</div>
      <table className="pts-table">
        <thead>
          <tr><th>Tier</th><th>Min Tokens</th><th>Points/Day</th><th>Cooldown</th><th>Max Refund</th></tr>
        </thead>
        <tbody>
          {POINTS_TIERS.map((t) => (
            <tr key={t.name}>
              <td>{t.name}</td>
              <td>{t.min}</td>
              <td>{t.pts.toLocaleString()}</td>
              <td>{t.cooldown}</td>
              <td>{t.refund}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 6. Quality & Trust */}
      <div className="pts-heading" style={{ marginTop: 64, marginBottom: 16 }}>Quality &amp; Trust</div>
      <p className="gt-header-body" style={{ marginBottom: 24 }}>
        We use AI to score your tweet quality. Genuine, original content about GASCOIN earns up to 1.5x bonus. Spam, bot engagement, and hashtag-stuffing get penalized (0.1–0.3x). Your wallet builds a trust score over time — veterans with clean records earn 1.2x on everything.
      </p>

      {/* 7. Leaderboard Ranking */}
      <div className="pts-heading" style={{ marginTop: 64, marginBottom: 16 }}>Leaderboard Ranking</div>
      <p className="gt-header-body" style={{ marginBottom: 24 }}>
        Your leaderboard rank is based on a composite score weighted toward long-term commitment:
      </p>
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
      <div className="pts-callout" style={{ marginTop: 24 }}>
        Holding GASCOIN is the strongest signal. Whales who also create content and refer users are untouchable on the leaderboard.
      </div>
    </section>
  );
}

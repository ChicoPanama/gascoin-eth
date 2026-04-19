import Link from 'next/link';
import { Nav } from '../../components/Nav';
import { GATE_COUNT } from '../../lib/policy';

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

      <div className="hiw-cta">
        <Link href="/submit" className="gc-btn-solid">Start Submitting</Link>
        <Link href="/docs" className="gc-btn-ghost">Read the Full Docs</Link>
      </div>
    </div>
  );
}

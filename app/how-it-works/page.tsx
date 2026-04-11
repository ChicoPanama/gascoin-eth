import Link from 'next/link';
import { Nav } from '../../components/Nav';

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
    body: 'You buy gas at any gas station. You post proof on X. You get real money sent to your digital wallet. No catch. No middlemen. Funded by the GASCOIN community treasury on Solana.',
    bullets: [],
  },
  {
    number: 1,
    title: 'Set Up a Solana Wallet',
    time: '5 min',
    bullets: [
      'Download Phantom wallet — it\'s a free app for your phone or browser. Think of it like Venmo, but for crypto.',
      'Create your wallet. It gives you a "seed phrase" (12 words). Write these down on paper and keep them safe. Never share them with anyone.',
      'Your wallet address is a long string of letters and numbers — like a bank account number. It\'s safe to share.',
    ],
    links: [
      { name: 'Phantom', url: 'https://phantom.app', icon: brand('phantom') },
      { name: 'iOS App', url: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977', icon: brand('apple') },
      { name: 'Android App', url: 'https://play.google.com/store/apps/details?id=app.phantom', icon: brand('google-play') },
    ],
  },
  {
    number: 2,
    title: 'Set Up X (Twitter)',
    time: '2 min',
    bullets: [
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
    title: 'Get SOL',
    time: '5 min',
    bullets: [
      'SOL is the currency of Solana — you need it to buy GASCOIN tokens and pay tiny transaction fees.',
      'You can buy SOL directly inside Phantom with a debit card — easiest option for beginners.',
      'Or buy SOL on an exchange and send it to your Phantom wallet address.',
      'Moonpay also lets you buy SOL with a card and send it straight to your wallet.',
    ],
    links: [
      { name: 'Phantom Buy', url: 'https://phantom.app', icon: brand('phantom') },
      { name: 'Coinbase', url: 'https://www.coinbase.com', icon: brand('coinbase') },
      { name: 'Binance', url: 'https://www.binance.com', icon: brand('binance') },
      { name: 'Bybit', url: 'https://www.bybit.com', icon: brand('bybit') },
      { name: 'OKX', url: 'https://www.okx.com', icon: brand('okx') },
      { name: 'Bitget', url: 'https://www.bitget.com', icon: brand('bitget') },
      { name: 'Gate.io', url: 'https://www.gate.io', icon: brand('gate') },
      { name: 'MEXC', url: 'https://www.mexc.com', icon: brand('mexc') },
      { name: 'Moonpay', url: 'https://www.moonpay.com', icon: brand('moonpay') },
    ],
  },
  {
    number: 4,
    title: 'Get GASCOIN Tokens',
    time: '3 min',
    bullets: [
      'You need to hold at least 1 GASCOIN token in your Phantom wallet before you can submit.',
      'Swap some SOL for GASCOIN on a Solana DEX — search for the GASCOIN token.',
      'Holding more GASCOIN unlocks higher tiers with bigger refund caps and faster queue priority.',
    ],
    links: [
      { name: 'Jupiter', url: 'https://jup.ag', icon: brand('jupiter') },
      { name: 'Raydium', url: 'https://raydium.io', icon: brand('raydium') },
      { name: 'Meteora', url: 'https://meteora.ag', icon: brand('meteora') },
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
      'Open Phantom and find your wallet address (tap your address to copy it).',
      'Write the LAST 4 characters of your wallet address on the receipt with a black pen.',
      'Write them big and clear — the system uses a camera to read them automatically.',
      'Example: if your wallet ends in "cR3P", write cR3P on the receipt.',
    ],
    links: [
      { name: 'Open Phantom', url: 'https://phantom.app/ul/browse', icon: brand('phantom') },
    ],
  },
  {
    number: 7,
    title: 'Post on X',
    time: '1 min',
    bullets: [
      'Post a tweet on X with the hashtag #gascoin. Original videos earn 3x points — record yourself, share your story, show your receipt at the pump. Reposts earn almost nothing.',
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
      'Click "Connect Wallet" and connect your Phantom wallet.',
      'Sign in with your X account.',
      'Paste your tweet URL.',
      'Upload a clear photo of your receipt (with the last 4 wallet characters visible).',
      'Check the 3 confirmation boxes and hit Submit.',
    ],
    links: [
      { name: 'Submit Receipt', url: '/submit', icon: '/logo/gascoin-g.jpg' },
    ],
  },
  {
    number: 9,
    title: 'Wait for Verification',
    bullets: [
      'The system automatically runs 10 verification checks on your submission. This takes 2-5 minutes.',
      'If all checks pass, an admin reviews your submission and approves it.',
      'SOL is sent directly to your Phantom wallet within 24-48 hours.',
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
      'Your SOL is already in your Phantom wallet — you can hold it, spend it, or convert it to dollars.',
      'Send SOL to an exchange and sell it for USD, EUR, or your local currency.',
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

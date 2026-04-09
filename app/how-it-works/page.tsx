import Link from 'next/link';
import { Nav } from '../../components/Nav';

const STEPS = [
  {
    number: 0,
    title: 'What is GASCOIN?',
    body: `You buy gas at any gas station. You post proof on X. You get real money sent to your digital wallet. No catch. No middlemen. Funded by the GASCOIN community treasury on Solana.`,
    bullets: [],
  },
  {
    number: 1,
    title: 'Set Up a Solana Wallet',
    time: '5 min',
    body: null,
    bullets: [
      'Download Phantom wallet — it\'s a free app for your phone or browser. Think of it like Venmo, but for crypto.',
      'Create your wallet. It gives you a "seed phrase" (12 words). Write these down on paper and keep them safe. Never share them with anyone.',
      'Your wallet address is a long string of letters and numbers — like a bank account number. It\'s safe to share.',
    ],
  },
  {
    number: 2,
    title: 'Set Up X (Twitter)',
    time: '2 min',
    body: null,
    bullets: [
      'You need a public X account with at least 100 followers.',
      'Your profile needs a bio and some posting history — brand new or empty accounts won\'t pass verification.',
      'Private accounts don\'t work. The system needs to see your tweet publicly.',
    ],
  },
  {
    number: 3,
    title: 'Get GASCOIN Tokens',
    time: '5 min',
    body: null,
    bullets: [
      'You need to hold at least $1 worth of GASCOIN tokens in your Phantom wallet before you can submit.',
      'First, buy SOL (the currency of Solana). You can buy it directly in Phantom with a debit card, or through Coinbase / Moonpay.',
      'Then swap some SOL for GASCOIN on a Solana exchange like Jupiter or Raydium — just search for the GASCOIN token.',
      'Holding more GASCOIN unlocks higher tiers with bigger refunds — up to 1.0 SOL per fill-up.',
    ],
  },
  {
    number: 4,
    title: 'Buy Gas',
    body: null,
    bullets: [
      'Fill up at any gas station — anywhere in the world.',
      'Ask for a paper receipt. Digital receipts, email receipts, and app receipts are not accepted.',
      'Keep the receipt. You\'ll photograph it in a few minutes.',
    ],
  },
  {
    number: 5,
    title: 'Write on Your Receipt',
    time: '30 sec',
    body: null,
    bullets: [
      'Open Phantom and find your wallet address (tap your address to copy it).',
      'Write the LAST 4 characters of your wallet address on the receipt with a black pen.',
      'Write them big and clear — the system uses a camera to read them automatically.',
      'Example: if your wallet ends in "cR3P", write cR3P on the receipt.',
    ],
  },
  {
    number: 6,
    title: 'Post on X',
    time: '1 min',
    body: null,
    bullets: [
      'Post a tweet on X. Say whatever you want — just include the hashtag #gascoin somewhere in the tweet.',
      'Keep the tweet up. If you delete it, your submission will fail verification.',
      'Copy the URL of your tweet — you\'ll paste it in the next step.',
    ],
  },
  {
    number: 7,
    title: 'Submit on GASCOIN',
    time: '3 min',
    body: null,
    bullets: [
      'Go to the Submit page on GASCOIN.',
      'Click "Connect Wallet" and connect your Phantom wallet.',
      'Sign in with your X account.',
      'Paste your tweet URL.',
      'Upload a clear photo of your receipt (with the last 4 wallet characters visible).',
      'Check the 3 confirmation boxes and hit Submit.',
    ],
  },
  {
    number: 8,
    title: 'Wait for Verification',
    body: null,
    bullets: [
      'The system automatically runs 10 verification checks on your submission. This takes 2-5 minutes.',
      'If all checks pass, an admin reviews your submission and approves it.',
      'SOL is sent directly to your Phantom wallet within 24-48 hours.',
      'You can track your submission status on the Tracker page.',
    ],
  },
  {
    number: 9,
    title: 'Cash Out',
    subtitle: 'Optional',
    body: null,
    bullets: [
      'Your SOL is already in your Phantom wallet — you can hold it, spend it, or convert it to dollars.',
      'To convert to USD: send your SOL to an exchange like Coinbase or Kraken and sell it.',
      'Or use an on-ramp like Moonpay to send it directly to your bank account.',
      'You can submit again after 7 days with a new receipt.',
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container">
      <Nav />

      <header className="hiw-header">
        <h1>How It Works</h1>
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

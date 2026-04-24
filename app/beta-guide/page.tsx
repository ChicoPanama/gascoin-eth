import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '../../components/Nav';
import { GATE_COUNT } from '../../lib/policy';
import { isBeta } from '../../lib/season';

export const metadata: Metadata = {
  title: 'Season 1 Tester Handbook · GASCOIN',
  description:
    'What to test, how to earn beta points, what happens at launch, and how to report bugs. Required reading for invited Season 1 testers.',
  robots: { index: false, follow: false },
};

type Section = {
  num: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    num: '01',
    title: 'Your rewards wallet',
    body: (
      <>
        <p>
          When you redeem your invite code, GASCOIN pins the wallet you
          connected to your X account. That wallet becomes your{' '}
          <strong>Season 1 Pioneer Bonus</strong> payout address. Every beta
          claim you submit must come from this exact wallet — otherwise the
          server rejects the submission (HTTP 409{' '}
          <code>wallet_mismatch_with_locked_beta_wallet</code>).
        </p>
        <p>
          <strong>Check your locked wallet</strong> on{' '}
          <Link href="/wallet">/wallet</Link>. If you lose access to it,{' '}
          <strong>DM @GasCoinApp on X immediately</strong> — we can migrate
          your lock before launch, but only with proof. Don’t wait.
        </p>
        <p className="bg-tip">
          Use a self-custodial wallet you’ll still control months from
          now. MetaMask, Rainbow, Rabby, Coinbase Wallet, hardware wallets —
          all fine. Do <em>not</em> use an exchange deposit address.
        </p>
      </>
    ),
  },
  {
    num: '02',
    title: 'What you’re testing',
    body: (
      <>
        <p>
          You’re stress-testing the {GATE_COUNT}-gate verification
          pipeline + three-AI oversight stack (Gemini Vision for OCR, Grok
          for cross-validation, Claude for pre-payout review). The full
          gate reference is on <Link href="/gates">/gates</Link>.
        </p>
        <p>
          The product thesis is that GASCOIN can send real ETH refunds to
          real people based only on receipt photos + public tweets without
          human review. If there’s a way to bypass that, we need you to
          find it before an adversary does. That’s your job.
        </p>
      </>
    ),
  },
  {
    num: '03',
    title: 'How to earn beta points',
    body: (
      <>
        <ul>
          <li>
            <strong>Submit real receipts.</strong> Each approved submission
            credits beta points to your locked wallet. Fake receipts get
            caught by the fraud pipeline and do not earn.
          </li>
          <li>
            <strong>Post quality tweets.</strong> Tag <code>@GasCoinApp</code>,
            include <code>#gascoin</code> or <code>$GAS</code>. Real
            engagement (likes, replies, reposts) earns engagement points via
            the hourly <code>score-engagement</code> worker.
          </li>
          <li>
            <strong>Refer other invited testers.</strong> Your referral code
            is on <Link href="/me">/me</Link>. When a referred tester
            completes an approved submission, you earn a conversion point
            bonus.
          </li>
          <li>
            <strong>Watch your balance.</strong>{' '}
            <Link href="/wallet">/wallet</Link> shows live point
            accumulation, broken out by source (submission, engagement,
            referrals).
          </li>
        </ul>
      </>
    ),
  },
  {
    num: '04',
    title: 'What happens at launch',
    body: (
      <>
        <p>
          At Season 1 close we convert your beta points to a{' '}
          <strong>Pioneer Bonus</strong> paid out in ETH to your locked
          wallet. Exact conversion rate is finalized + announced before
          close — it scales with total beta activity, so high-signal
          testers get a bigger slice.
        </p>
        <p>
          Every beta point row is tagged{' '}
          <code>metadata.beta = true</code> in the database, which means
          reconciliation is surgical: we can verify every single point
          award and where it came from. No guesswork.
        </p>
      </>
    ),
  },
  {
    num: '05',
    title: 'What to stress-test (the meat)',
    body: (
      <>
        <p>Things we want you to actively try to break:</p>
        <ul>
          <li>
            <strong>AI-generated receipts.</strong> Make one with your
            model of choice, submit it. We dropped the AI-image threshold
            from 0.65 to 0.5 this week — if yours slides through, we need
            to hear it.
          </li>
          <li>
            <strong>Low-resolution / OCR-unreadable photos.</strong> We just
            closed the fail-open holes on{' '}
            <code>receipt_date_valid</code> and{' '}
            <code>amount_verified</code>. Confirm they reject rather than
            silently pass.
          </li>
          <li>
            <strong>Wallet mismatch.</strong> Try submitting with a
            different wallet than the one you redeemed your invite with.
            Should get HTTP 409.
          </li>
          <li>
            <strong>Follow gate timing.</strong> Unfollow{' '}
            <code>@GasCoinApp</code>, try to submit, refollow, tap the
            “Recheck follow status” button on Step 5, submit again. The
            cache should catch up.
          </li>
          <li>
            <strong>Cooldown boundary.</strong> Submit two legit receipts
            in rapid succession. The second should fail on the cooldown
            gate.
          </li>
          <li>
            <strong>Tweet edge cases.</strong> Post without{' '}
            <code>#gascoin</code>, with only <code>$GAS</code>, without
            the <code>@GasCoinApp</code> tag, with the tweet deleted after
            submission.
          </li>
          <li>
            <strong>Sub-$5 receipts.</strong> Try submitting with the
            “my receipt is $5 or more” box unchecked. Try checking it on a
            $3 receipt. The OCR layer should catch the lie.
          </li>
          <li>
            <strong>Receipts older than 7 days.</strong> Should fail the
            <code>receipt_date_valid</code> gate.
          </li>
          <li>
            <strong>&lt;100 follower account.</strong> Should fail the
            <code>min_followers</code> gate fast, before OCR runs.
          </li>
        </ul>
      </>
    ),
  },
  {
    num: '06',
    title: 'What NOT to do',
    body: (
      <>
        <ul>
          <li>
            <strong>Don’t share your invite code.</strong>{' '}
            Single-use — once redeemed it pins to one wallet permanently.
          </li>
          <li>
            <strong>Don’t switch wallets.</strong> The Pioneer Bonus pays
            to the first wallet you redeemed with. Switching means losing
            access to the bonus.
          </li>
          <li>
            <strong>Don’t use bots</strong> for engagement. Our bot
            detector runs on every tweet score; flagged engagement zeros
            out your points and can flag your trust score.
          </li>
          <li>
            <strong>Don’t submit other people’s receipts.</strong> The
            last-4-chars-of-wallet requirement on the physical receipt is
            specifically to prevent this.
          </li>
        </ul>
      </>
    ),
  },
];

export default function BetaGuidePage() {
  // Defensive: when the launch flag flips to live, this page should not
  // surface beta-tester framing. Render a "moved on" stub instead.
  if (!isBeta()) {
    return (
      <>
        <Nav />
        <main className="bg-main">
          <section className="bg-hero">
            <div className="bg-hero-kicker">— POST-SEASON 1</div>
            <h1 className="bg-hero-title">Season 1 is closed.</h1>
            <p className="bg-hero-lede">
              Beta is over. The Pioneer Bonus has been distributed to
              locked wallets. See <Link href="/docs">/docs</Link> for the
              live protocol manual.
            </p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="bg-main">
        <section className="bg-hero">
          <div className="bg-hero-kicker">— SEASON 1 · TESTER HANDBOOK</div>
          <h1 className="bg-hero-title">
            You’re stress-testing GASCOIN before public launch.
          </h1>
          <p className="bg-hero-lede">
            This page is for invited Season 1 testers. It explains what to
            test, how to earn beta points, what happens at launch, and
            where to report bugs. Read it once. The product depends on you
            actually trying to break it.
          </p>
          <div className="bg-hero-actions">
            <Link href="/submit" className="bg-btn-solid">
              Go to submit flow →
            </Link>
            <Link href="/gates" className="bg-btn-ghost">
              View all {GATE_COUNT} gates
            </Link>
          </div>
        </section>

        <div className="bg-sections">
          {SECTIONS.map((section) => (
            <section key={section.num} className="bg-section">
              <div className="bg-section-num">{section.num}</div>
              <h2 className="bg-section-title">{section.title}</h2>
              <div className="bg-section-body">{section.body}</div>
            </section>
          ))}
        </div>

        <section className="bg-footer-cta">
          <div className="bg-footer-cta-kicker">— REPORT A BUG</div>
          <h2 className="bg-footer-cta-title">DM @GasCoinApp on X.</h2>
          <p className="bg-footer-cta-body">
            Screenshots + what you were doing. Response within 24 hours.
            Anything that feels wrong — confusing copy, unexpected
            rejection, slow flow, fraud the system didn’t catch — we want
            to hear about.
          </p>
          <a
            href="https://x.com/GasCoinApp"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-btn-solid"
          >
            Open @GasCoinApp on X →
          </a>
        </section>
      </main>

      <style>{`
        .bg-main {
          max-width: 880px;
          margin: 0 auto;
          padding: 48px 24px 96px;
          color: var(--fg);
        }
        .bg-hero {
          padding-bottom: 56px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 48px;
        }
        .bg-hero-kicker {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 12px;
          letter-spacing: 0.15em;
          color: var(--status-warn, #d97706);
          margin-bottom: 24px;
        }
        .bg-hero-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(40px, 7vw, 72px);
          line-height: 1.05;
          letter-spacing: -0.01em;
          margin: 0 0 20px;
          text-transform: uppercase;
        }
        .bg-hero-lede {
          font-size: 17px;
          line-height: 1.6;
          max-width: 640px;
          color: rgba(255,255,255,0.75);
          margin: 0 0 28px;
        }
        .bg-hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .bg-sections {
          display: flex;
          flex-direction: column;
          gap: 56px;
        }
        .bg-section {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 24px 24px;
          align-items: start;
        }
        .bg-section-num {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 14px;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.4);
          padding-top: 6px;
          grid-row: 1;
        }
        .bg-section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          line-height: 1.1;
          letter-spacing: -0.005em;
          margin: 0;
          text-transform: uppercase;
          grid-column: 2;
          grid-row: 1;
        }
        .bg-section-body {
          grid-column: 2;
          grid-row: 2;
          font-size: 15px;
          line-height: 1.65;
          color: rgba(255,255,255,0.82);
        }
        @media (max-width: 640px) {
          .bg-section { grid-template-columns: 1fr; gap: 12px; }
          .bg-section-num, .bg-section-title, .bg-section-body {
            grid-column: 1; grid-row: auto;
          }
        }
        .bg-section-body p { margin: 0 0 14px; }
        .bg-section-body p:last-child { margin-bottom: 0; }
        .bg-section-body ul { padding-left: 22px; margin: 0; }
        .bg-section-body li { margin-bottom: 10px; }
        .bg-section-body code {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 13px;
          background: rgba(255,255,255,0.05);
          padding: 1px 6px;
          border-radius: 0;
        }
        .bg-section-body a { color: var(--status-warn, #d97706); }
        .bg-tip {
          padding: 14px 16px;
          border-left: 3px solid var(--status-warn, #d97706);
          background: rgba(217, 119, 6, 0.06);
          font-size: 14px;
          color: rgba(255,255,255,0.8);
        }
        .bg-footer-cta {
          margin-top: 80px;
          padding: 40px 32px;
          border: 1px solid var(--line);
          text-align: center;
        }
        .bg-footer-cta-kicker {
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 11px;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.55);
          margin-bottom: 14px;
        }
        .bg-footer-cta-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 36px;
          margin: 0 0 14px;
          text-transform: uppercase;
        }
        .bg-footer-cta-body {
          max-width: 480px;
          margin: 0 auto 22px;
          font-size: 15px;
          line-height: 1.6;
          color: rgba(255,255,255,0.75);
        }
        .bg-btn-solid {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--fg);
          color: var(--bg);
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          border: none;
          border-radius: 0;
          cursor: pointer;
          transition: opacity 120ms ease;
        }
        .bg-btn-solid:hover { opacity: 0.85; }
        .bg-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: transparent;
          color: var(--fg);
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          border: 1px solid var(--line);
          border-radius: 0;
          transition: border-color 120ms ease;
        }
        .bg-btn-ghost:hover { border-color: rgba(255,255,255,0.5); }
      `}</style>
    </>
  );
}

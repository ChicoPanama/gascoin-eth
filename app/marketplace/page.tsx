import Link from 'next/link';
import type { Metadata } from 'next';
import { isMarketplaceLive } from '../../lib/marketplace';

export const metadata: Metadata = {
  title: 'Creator Marketplace · GASCOIN',
  description:
    'Performance-gated creator marketplace. Brands lock USDC; creators get paid when verified audience impact hits the threshold.',
  // Listed but unindexed while feature flag is off
  robots: { index: false, follow: false, nocache: true },
};

export default function MarketplacePage() {
  const live = isMarketplaceLive();

  return (
    <main className="gc-marketplace">
      <section className="gc-marketplace-hero">
        <div className="gc-marketplace-kicker">— Gas Network Phase IV</div>
        <h1 className="gc-marketplace-title">
          Performance-gated creator marketplace.
        </h1>
        <p className="gc-marketplace-lede">
          Brands lock USDC. Creators post. Payment releases only when the tweet
          hits a verified impact score — scored by the same 18-gate pipeline
          that already powers GASCOIN gas refunds.
        </p>
        {!live && (
          <div className="gc-marketplace-coming-soon">
            <span className="gc-marketplace-badge">Coming soon</span>
            <p>
              The contract is deployed, the settlement worker is running, the
              admin tooling is live. Public brand/creator UIs launch next.
            </p>
            <a
              href="mailto:brands@gascoin.app?subject=GASCOIN%20Marketplace%20early%20access"
              className="gc-btn gc-btn--primary"
            >
              Request early access →
            </a>
          </div>
        )}
      </section>

      <section className="gc-marketplace-section">
        <h2>How it works</h2>
        <ol className="gc-marketplace-steps">
          <li>
            <strong>Brand posts a brief.</strong> Budget in USDC. Minimum
            impact score. Deadline. Required tags (default{' '}
            <code>#gascoin @GasCoinApp</code>).
          </li>
          <li>
            <strong>USDC locks on-chain.</strong> Brand pays the budget plus a
            3% brand fee. Nothing releases until performance is verified.
          </li>
          <li>
            <strong>Creator applies.</strong> Verified GASCOIN handles only.
            Brand accepts one — irreversible on-chain binding.
          </li>
          <li>
            <strong>Creator posts.</strong> Every tweet passes through the same
            15-gate fraud pipeline + three-AI review already used by gas
            refunds. Impact score computes automatically.
          </li>
          <li>
            <strong>Payout or refund.</strong> If the tweet hits threshold, our
            backend signs an EIP-712 attestation and the creator claims. If
            not, the brand refunds after the deadline grace.
          </li>
        </ol>
      </section>

      <section className="gc-marketplace-section">
        <h2>Why brands use it</h2>
        <ul className="gc-marketplace-bullets">
          <li>Zero "pay and pray" — funds only release on verified performance.</li>
          <li>Impact score is computed, not claimed. Creators can't game it.</li>
          <li>Full on-chain audit trail — every release + refund has a tx hash.</li>
          <li>Flat 3% protocol fee. No hidden take rate at payout.</li>
        </ul>
      </section>

      <section className="gc-marketplace-section">
        <h2>Why creators use it</h2>
        <ul className="gc-marketplace-bullets">
          <li>Brand can't stiff you — escrow enforces payment on performance.</li>
          <li>Your GASCOIN tier &amp; impact history builds your pricing power.</li>
          <li>Flat 3% creator fee. Paid in USDC, direct to your wallet.</li>
          <li>Post where you already post — no platform migration, no new app.</li>
        </ul>
      </section>

      <footer className="gc-marketplace-footer">
        <Link href="/how-it-works">How GASCOIN works →</Link>
      </footer>
    </main>
  );
}

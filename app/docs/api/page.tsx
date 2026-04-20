import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Intelligence API · GASCOIN',
  description: 'Paywalled creator intelligence + content-impact scoring API. Tiered by $GASCOIN balance.',
  robots: { index: false, follow: false, nocache: true },
};

export default function ApiDocsPage() {
  return (
    <main className="gc-docs">
      <header className="gc-docs-header">
        <h1>Gas Network Intelligence API</h1>
        <p className="gc-docs-sub">
          Verified creator data, content-impact scoring, and signed reach
          certificates. Tier is derived live from your connected wallet's
          $GASCOIN balance every request.
        </p>
      </header>

      <section>
        <h2>Tiers</h2>
        <table className="gc-docs-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Min $GASCOIN</th>
              <th>Daily requests</th>
              <th>Fields</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Free</td><td>0</td><td>10</td><td>handle · basic counts</td></tr>
            <tr><td>Builder</td><td>1,000</td><td>1,000</td><td>+ impact score · ETH earned</td></tr>
            <tr><td>Agency</td><td>100,000</td><td>10,000</td><td>+ audience signals · history · recent posts</td></tr>
            <tr><td>Enterprise</td><td>1,000,000</td><td>100,000</td><td>+ signed envelopes · batch</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Authentication</h2>
        <p>Send your API key in the <code>x-gascoin-api-key</code> header (also accepted as a <code>Bearer</code> token).</p>
        <pre>{`curl -H "x-gascoin-api-key: gcn_..." \\
     https://gascoin.app/api/v1/creators`}</pre>
        <p>
          Generate a key by POSTing to <code>/api/v1/keys</code> with a valid
          Privy session. Plaintext is returned once at creation; only the
          hash is stored server-side.
        </p>
      </section>

      <section>
        <h2>Endpoints</h2>
        <h3><code>GET /api/v1/creators</code></h3>
        <p>List top verified creators. Query: <code>min_impact</code>, <code>min_followers</code>, <code>limit</code> (≤100).</p>

        <h3><code>GET /api/v1/creators/:handle</code></h3>
        <p>Single creator detail. Shape expands by tier; Enterprise receives a signed envelope.</p>

        <h3><code>GET /api/v1/content/:tweet_id</code></h3>
        <p>Per-post impact score + metrics. Builder tier and above.</p>

        <h3><code>GET /api/v1/reach/:handle</code></h3>
        <p>Signed reach certificate payload — feeds downstream systems (including on-chain certificates). Agency tier and above.</p>
      </section>

      <section>
        <h2>Signed envelope format (Enterprise)</h2>
        <pre>{`{
  "data": {...},
  "timestamp": 1776570000,
  "nonce": "a1b2c3d4",
  "keyId": "v1",
  "signature": "<hex sha256 hmac>"
}`}</pre>
        <p>
          Verify with HMAC-SHA256 over{' '}
          <code>keyId | timestamp | nonce | JSON(data)</code> using the
          distributed signing key. Reject envelopes older than 5 minutes
          (replay window).
        </p>
      </section>

      <section>
        <h2>Rate limiting + quota</h2>
        <p>Response headers on every call:</p>
        <ul>
          <li><code>x-gascoin-tier</code> — your current effective tier</li>
          <li><code>x-gascoin-quota-remaining</code> — requests left in the 24h window</li>
          <li><code>x-gascoin-quota-reset</code> — seconds until quota resets</li>
        </ul>
        <p>429 response if the quota is exceeded. Tier is recomputed live each request — selling $GASCOIN downgrades your access immediately (Redis cache 75s).</p>
      </section>

      <footer className="gc-docs-footer">
        <Link href="/docs">← All docs</Link>
      </footer>
    </main>
  );
}

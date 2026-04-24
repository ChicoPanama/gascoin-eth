/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
    ],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        pathname: '/coins/images/**',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    const baseSecurityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
      },
      // Isolate the origin from cross-origin windows/workers. Stops
      // Spectre-style side-channel leaks + some cross-origin scrapers.
      // `same-origin-allow-popups` keeps cross-origin WINDOW isolation
      // but permits popups opened by the page to retain opener access —
      // required for Coinbase Smart Wallet + Base Account popup-based
      // auth (both SDKs explicitly log and refuse under strict
      // `same-origin`). Third-party cross-origin pages still can't
      // access our window.
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      // Tell every bot to back off indexing, AI training, and snippeting.
      // Even pages without <meta robots> inherit this via response header.
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, nosnippet, noarchive, noai, noimageai, indexifembedded, max-snippet:0, max-image-preview:none' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' https: data: blob:",
          // WalletConnect explorer-api powers Privy's wallet picker (list of
          // supported WalletConnect-compatible wallets). pulse.walletconnect
          // is their telemetry. Both required for the wallet login flow.
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://auth.privy.io https://*.privy.io https://eth-mainnet.g.alchemy.com https://mainnet.infura.io https://api.etherscan.io https://api.coingecko.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
          // Privy's WalletConnect modal + Coinbase/Base wallet SDKs use
          // iframes for QR display and deep-link handoff.
          "frame-src https://auth.privy.io https://*.privy.io https://*.walletconnect.com https://*.walletconnect.org https://*.coinbase.com",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "upgrade-insecure-requests",
        ].join('; '),
      },
    ];

    return [
      // Global — applies to every route by default.
      { source: '/(.*)', headers: baseSecurityHeaders },
      // Stricter no-cache + no-referrer on any non-public surface. These
      // never belong in a CDN and must not leak a Referer header upstream.
      {
        source: '/:path(admin|api|presale|submit|me|wallet|dashboard|referral|invite|invites)(/.*)?',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      // Docs can be public-cached.
      {
        source: '/docs/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/(.*)\\.woff2',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/gate/:num', destination: '/gates', permanent: false },
      { source: '/track', destination: '/wallet', permanent: false },
      { source: '/refer', destination: '/referral', permanent: false },
    ];
  },

  // Sentry uploads the source maps at build time (authenticated upload
  // via SENTRY_AUTH_TOKEN); they are NOT shipped to the browser because
  // withSentryConfig() deletes them post-upload. Flipping this to true
  // is required for Sentry's build plugin to find them before deletion.
  productionBrowserSourceMaps: true,
  poweredByHeader: false,

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    // Privy pulls in Farcaster Solana compat transitively; we don't use it on ETH.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@farcaster/mini-app-solana': false,
      '@farcaster/miniapp-sdk': false,
    };
    return config;
  },
};

// Wrap with Sentry's build plugin. This:
//   - uploads source maps to Sentry at build time (authenticated via
//     SENTRY_AUTH_TOKEN) so production stack traces are readable
//   - installs the /monitoring tunnel route so event delivery isn't
//     blocked by ad-blockers / shield extensions
//   - injects server-side instrumentation so route handler errors
//     (thrown exceptions, unhandled rejections) get captured automatically
//
// `authToken` is read from env at BUILD time only, never at runtime —
// so a missing token during local dev just skips source-map upload
// and everything still works.
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  org: 'chicopanama',
  project: 'javascript-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Defer source-map upload to Next.js `runAfterProductionCompile` hook
  // so it runs AFTER the build finishes instead of racing webpack.
  // Default is true on Turbopack, false on Webpack — we opt in.
  // Fixes the upload-during-build hang that stalls Vercel deploys
  // (see getsentry/sentry-javascript#13533, #14132).
  useRunAfterProductionCompileHook: true,

  // If sentry.io is slow/unreachable, don't fail or hang the build —
  // log and move on. Source maps can always be uploaded later via
  // `sentry-cli sourcemaps upload`.
  errorHandler: () => {},

  // Skip the extra release create/finalize API round-trips that add
  // latency and extra failure surface during upload.
  release: { create: false, finalize: false },

  // Narrow to entry bundles instead of shared chunks — trims upload
  // time materially without meaningful loss in frame resolution.
  widenClientFileUpload: false,

  // Only attempt source-map upload on actual production deploys.
  // Preview builds get the Sentry runtime without the upload step.
  sourcemaps: {
    disable: process.env.VERCEL_ENV !== 'production',
  },

  // Proxy Sentry ingestion through our own domain at /monitoring.
  // Bypasses ad-blockers (uBlock, Brave Shields) that would otherwise
  // drop event POSTs to *.ingest.sentry.io. CSP connect-src doesn't
  // need sentry.io anymore because of this — traffic looks like a
  // same-origin POST to the browser.
  tunnelRoute: '/monitoring',

  // Noisy on every local/CI build unless we're in GitHub Actions.
  silent: !process.env.CI,

  // Skip telemetry ping — we already pay with our events.
  telemetry: false,
});

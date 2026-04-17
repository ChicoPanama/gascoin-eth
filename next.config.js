const path = require('path');
const fs = require('fs');

// Resolve the physical @solana/kit path so shims work on npm (Vercel) and pnpm (local).
// We can't use the bare specifier in the shim or the webpack alias creates an infinite loop.
const solanaKitDir = path.dirname(require.resolve('@solana/kit/package.json'));
const solanaKitNodeEntry = path.join(solanaKitDir, 'dist/index.node.mjs');
const solanaKitBrowserEntry = path.join(solanaKitDir, 'dist/index.browser.mjs');
const toUnixPath = (p) => p.replace(/\\/g, '/');

fs.writeFileSync(
  path.join(__dirname, 'shims/solana-kit-compat.node.mjs'),
  `export * from '${toUnixPath(solanaKitNodeEntry)}';\nexport function sequentialInstructionPlan(plans) { return plans; }\n`,
);
fs.writeFileSync(
  path.join(__dirname, 'shims/solana-kit-compat.browser.mjs'),
  `// Compat shim: re-exports @solana/kit and adds sequentialInstructionPlan\n// which was removed in 2.3.0 but is still imported by @solana-program/token@0.9.0.\n// Physical path avoids circular alias resolution.\nexport * from '${toUnixPath(solanaKitBrowserEntry)}';\nexport function sequentialInstructionPlan(plans) { return plans; }\n`,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@solana/web3.js',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-wallets',
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
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' https: data: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://auth.privy.io https://*.privy.io https://api.mainnet-beta.solana.com https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.org",
              "frame-src https://auth.privy.io https://*.privy.io",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/docs/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400' },
        ],
      },
      {
        // Cache fonts
        source: '/(.*)\\.woff2',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Clean URL redirects
      { source: '/gate/:num', destination: '/gates', permanent: false },
      { source: '/track', destination: '/wallet', permanent: false },
      { source: '/refer', destination: '/referral', permanent: false },
    ];
  },

  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    // Shim @solana/kit@2.3.0 to add sequentialInstructionPlan removed in 2.3.0
    // but still imported by @solana-program/token@0.9.0 (via @privy-io/react-auth).
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana/kit': path.resolve(__dirname, 'shims/solana-kit-compat.node.mjs'),
    };
    return config;
  },

  turbopack: {
    resolveAlias: {
      fs: { browser: './empty-module.js' },
      os: { browser: './empty-module.js' },
      path: { browser: './empty-module.js' },
      crypto: { browser: './empty-module.js' },
      '@solana/kit': {
        browser: './shims/solana-kit-compat.browser.mjs',
        default: './shims/solana-kit-compat.node.mjs',
      },
    },
  },
};

module.exports = nextConfig;

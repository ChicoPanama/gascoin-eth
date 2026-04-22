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
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
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
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://auth.privy.io https://*.privy.io https://eth-mainnet.g.alchemy.com https://mainnet.infura.io https://api.etherscan.io https://api.coingecko.com",
          "frame-src https://auth.privy.io https://*.privy.io",
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
    // Privy pulls in Farcaster Solana compat transitively; we don't use it on ETH.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@farcaster/mini-app-solana': false,
      '@farcaster/miniapp-sdk': false,
    };
    return config;
  },
};

module.exports = nextConfig;

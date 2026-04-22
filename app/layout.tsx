import './globals.css';
import '../styles/wallet-override.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Bebas_Neue, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { Providers } from './providers';
import { GlobalFooter } from '../components/GlobalFooter';
import { GlobalChatAgent } from '../components/GlobalChatAgent';
import { THEME_INIT_SCRIPT } from '../components/ThemeProvider';

// Self-hosted + subsetted fonts. next/font fingerprints the URL and serves
// with `Cache-Control: public, max-age=31536000, immutable` — zero FOUT,
// no blocking round-trip to fonts.googleapis.com, and the browser can
// preload with the document request.
const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-bebas',
});
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex-sans',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Matches our dark-theme `--bg` so iOS/Android color the status bar
  // and browser chrome to blend with the page instead of a white band.
  // Users in light-mode still get a sensible color — #000 on chrome
  // reads as standard dark browser UI on both iOS Safari and Android
  // Chrome; we don't switch per theme because the chrome color lives
  // outside React state and toggling it mid-session flashes badly.
  themeColor: '#000000',
};

// Note: gate count is hardcoded here because Next.js metadata is evaluated
// at module load and we don't want to import policy.ts into the root layout.
// If GATE_COUNT changes, update the "14" in this description manually.
export const metadata: Metadata = {
  title: 'GASCOIN',
  description: 'Community gas refunds on Ethereum. Post $GASCOIN or #gascoin, submit a receipt, get ETH back.',
  openGraph: {
    title: 'GASCOIN — Community Gas Refunds on Ethereum',
    description: 'Post $GASCOIN or #gascoin on X, submit your gas receipt, and receive ETH directly to your wallet. 15 automated verification gates. No middlemen.',
    siteName: 'GASCOIN',
    type: 'website',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://gascoin.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GASCOIN — Community Gas Refunds on Ethereum',
    description: 'Post $GASCOIN or #gascoin on X, submit your gas receipt, and receive ETH directly to your wallet.',
  },
  icons: {
    icon: '/favicon.svg',
    // iPhone uses `apple-touch-icon` when the user taps "Add to Home
    // Screen". Without it, iOS generates a fuzzy screenshot of the
    // current page as the icon. We point at our GASCOIN G logo; any
    // PNG/JPG 180x180 or larger works — iOS rounds the corners itself.
    apple: '/logo/gascoin-g.jpg',
  },
  // PWA manifest — enables standalone mode when the user installs the
  // app to their home screen on Android (and on iOS 16.4+).
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GASCOIN',
  },
  // Universal opt-out from AI training + archive indexing. Per-route
  // metadata can still override (e.g. /presale sets noindex too). Also
  // enforced server-side via X-Robots-Tag in next.config.js.
  other: {
    'robots': 'noai, noimageai, max-snippet:0, max-image-preview:none',
    'googlebot': 'noai, noimageai, max-snippet:0, max-image-preview:none',
    // Explicit web-app-capable for older Android/WebKit that don't
    // follow the Next.js `appleWebApp` emit path.
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${plexSans.variable} ${plexMono.variable}`}
      // Theme init script sets data-theme on <html> from localStorage
      // before hydration, so React's SSR snapshot ("no data-theme") will
      // always differ from the client snapshot ("data-theme=light|dark").
      // This is the exact case suppressHydrationWarning was designed for
      // — same pattern next-themes + shadcn use. Applies to the <html>
      // element only; descendants still get full hydration checks.
      suppressHydrationWarning>
      <head>
        {/* Theme init — runs before React hydrates so the first paint is
            already in the correct mode. Reads localStorage `gc_theme` and
            sets data-theme on <html>. */}
        <Script
          id="gc-theme-init"
          strategy="beforeInteractive"
        >{THEME_INIT_SCRIPT}</Script>
      </head>
      <body>
        <a href="#main-content" className="skip-nav">Skip to content</a>
        <Providers>
          {children}
          <GlobalFooter />
          <GlobalChatAgent />
        </Providers>
      </body>
    </html>
  );
}

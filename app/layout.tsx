import './globals.css';
import '../styles/wallet-override.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Providers } from './providers';
import { GlobalFooter } from '../components/GlobalFooter';
import { GlobalChatAgent } from '../components/GlobalChatAgent';
import { THEME_INIT_SCRIPT } from '../components/ThemeProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Note: gate count is hardcoded here because Next.js metadata is evaluated
// at module load and we don't want to import policy.ts into the root layout.
// If GATE_COUNT changes, update the "14" in this description manually.
export const metadata: Metadata = {
  title: 'GASCOIN',
  description: 'Community gas refunds on Solana. Post $GASCOIN or #gascoin, submit a receipt, get SOL back.',
  openGraph: {
    title: 'GASCOIN — Community Gas Refunds on Solana',
    description: 'Post $GASCOIN or #gascoin on X, submit your gas receipt, and receive ETH directly to your wallet. 15 automated verification gates. No middlemen.',
    siteName: 'GASCOIN',
    type: 'website',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://gascoin.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GASCOIN — Community Gas Refunds on Solana',
    description: 'Post $GASCOIN or #gascoin on X, submit your gas receipt, and receive ETH directly to your wallet.',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Theme init — runs before React hydrates so the first paint is
            already in the correct mode. Reads localStorage `gc_theme` and
            sets data-theme on <html>. */}
        <Script
          id="gc-theme-init"
          strategy="beforeInteractive"
        >{THEME_INIT_SCRIPT}</Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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

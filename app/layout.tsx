import './globals.css';
import './project-gas.css';
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
  themeColor: '#000000',
};

// Root metadata remains legacy while the Project GAS prototype is staged on
// ux-lab. Route-specific Project GAS metadata is used on the new surfaces;
// the root metadata flips only when the new Home replaces the legacy product.
export const metadata: Metadata = {
  title: 'GASCOIN',
  description: 'Community gas refunds on Ethereum. Post $GAS or #gascoin, submit a receipt, get ETH back.',
  openGraph: {
    title: 'GASCOIN — Community Gas Refunds on Ethereum',
    description: 'Post $GAS or #gascoin on X, submit your gas receipt, and receive ETH directly to your wallet. 15 automated verification gates. No middlemen.',
    siteName: 'GASCOIN',
    type: 'website',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://gascoin.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GASCOIN — Community Gas Refunds on Ethereum',
    description: 'Post $GAS or #gascoin on X, submit your gas receipt, and receive ETH directly to your wallet.',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/logo/gascoin-g.jpg',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GASCOIN',
  },
  other: {
    'robots': 'noai, noimageai, max-snippet:0, max-image-preview:none',
    'googlebot': 'noai, noimageai, max-snippet:0, max-image-preview:none',
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning>
      <head>
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

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

export const metadata: Metadata = {
  title: {
    default: 'GAS — Project GAS',
    template: '%s · GAS',
  },
  description: 'Project GAS UX prototype: elastic money, a high-frequency provably-fair game, reserve transparency and SocialFi in one consumer application.',
  openGraph: {
    title: 'GAS — Elastic Money, Play and SocialFi',
    description: 'Project GAS UX prototype for the GAS elastic asset, GAS Original, reserve transparency and a verified social layer.',
    siteName: 'GAS',
    type: 'website',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://gascoin.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GAS — Project GAS',
    description: 'Elastic money, high-frequency play, reserve transparency and SocialFi in one consumer application.',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/logo/gascoin-g.jpg',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GAS',
  },
  other: {
    robots: 'noai, noimageai, max-snippet:0, max-image-preview:none',
    googlebot: 'noai, noimageai, max-snippet:0, max-image-preview:none',
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
        <Script id="gc-theme-init" strategy="beforeInteractive">{THEME_INIT_SCRIPT}</Script>
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

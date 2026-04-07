import './globals.css';
import '../styles/wallet-override.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'GASCOIN',
  description: 'Community gas refunds on Solana. Post #gascoin, submit a receipt, get SOL back.',
  openGraph: {
    title: 'GASCOIN — Community Gas Refunds on Solana',
    description: 'Post #gascoin on X, submit your gas receipt, and receive SOL directly to your wallet. 10 automated verification gates. No middlemen.',
    siteName: 'GASCOIN',
    type: 'website',
    url: 'https://platform-ebon-nine.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GASCOIN — Community Gas Refunds on Solana',
    description: 'Post #gascoin on X, submit your gas receipt, and receive SOL directly to your wallet.',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
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
        </Providers>
      </body>
    </html>
  );
}

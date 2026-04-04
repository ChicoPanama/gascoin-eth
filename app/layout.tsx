import './globals.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html><body><Providers><div className="container">{children}</div></Providers></body></html>;
}

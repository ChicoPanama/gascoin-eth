import type { Metadata } from 'next';
import PerksClient from './PerksClient';

export const metadata: Metadata = {
  title: 'Perks — GASCOIN',
  description: 'Token tier benefits and community perks for GASCOIN holders.',
};

export const revalidate = 300;

export default function PerksPage() {
  return <PerksClient />;
}

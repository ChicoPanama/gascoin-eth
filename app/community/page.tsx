import type { Metadata } from 'next';
import CommunityClient from './CommunityClient';

export const metadata: Metadata = {
  title: 'Community — GASCOIN',
  description: 'Live feed of verified GASCOIN gas refund receipts and community activity.',
};

export const revalidate = 60;

export default function CommunityPage() {
  return <CommunityClient />;
}

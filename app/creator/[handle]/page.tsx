import { notFound } from 'next/navigation';
import { getCreatorProfile, getCreatorPosts, getCreatorImpact } from '../../../lib/creator-profile';
import { CreatorProfileClient } from './CreatorProfileClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getCreatorProfile(handle);
  if (!profile) return { title: 'Creator not found · GASCOIN', robots: { index: false, follow: false } };
  return {
    title: `@${profile.handle} · GASCOIN Creator`,
    description: `Verified GASCOIN creator ${profile.isVerified ? '· verified ' : ''}· tier ${profile.tier || 'none'} · wallet ${profile.walletShort}`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [profile, posts, impact] = await Promise.all([
    getCreatorProfile(handle),
    getCreatorPosts(handle, 20),
    getCreatorImpact(handle),
  ]);

  if (!profile) notFound();

  return <CreatorProfileClient profile={profile} posts={posts} impact={impact} />;
}

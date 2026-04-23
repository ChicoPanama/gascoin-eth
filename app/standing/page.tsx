import type { Metadata } from 'next';
import StandingClient from './StandingClient';

export const metadata: Metadata = {
  title: 'Standing — GASCOIN',
  description: 'Where you stand on the GASCOIN topography. Hold, Earn, Reach, Influence, and marketplace eligibility in one view.',
};

export const revalidate = 300;

export default function StandingPage() {
  return <StandingClient />;
}

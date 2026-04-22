import type { Metadata } from 'next';
import GatesClient from './GatesClient';
import { GATE_COUNT } from '../../lib/policy';

export const metadata: Metadata = {
  title: `Gates — ${GATE_COUNT} Verification Layers — GASCOIN`,
  description: `Every GASCOIN submission passes through ${GATE_COUNT} sequential verification gates before ETH is released. Full system transparency.`,
};

export const revalidate = 60;

export default function GatesPage() {
  return <GatesClient />;
}

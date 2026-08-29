import type { Metadata } from 'next';
import { GasOriginalPrototype } from '@/components/gas/GasOriginalPrototype';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';

export const metadata: Metadata = {
  title: 'GAS Original — Project GAS',
  description: 'Choose CRUISE, BOOST or REDLINE, enter with USDC and play GAS Original.',
};

export default function GasOriginalPage() {
  return (
    <GasPrototypeShell>
      <GasOriginalPrototype />
    </GasPrototypeShell>
  );
}

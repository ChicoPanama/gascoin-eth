import type { Metadata } from 'next';
import { GasOriginalPrototype } from '@/components/gas/GasOriginalPrototype';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';

export const metadata: Metadata = {
  title: 'GAS Original — Project GAS',
  description: 'Project GAS mobile UX prototype for CRUISE, BOOST, REDLINE and IGNITION.',
};

export default function GasOriginalPage() {
  return (
    <GasPrototypeShell>
      <GasOriginalPrototype />
    </GasPrototypeShell>
  );
}

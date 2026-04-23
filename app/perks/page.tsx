import { permanentRedirect } from 'next/navigation';

// Old /perks surface renamed to /standing. Preserve link equity with 308.
export default function PerksLegacyRedirect(): never {
  permanentRedirect('/standing');
}

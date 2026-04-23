import { permanentRedirect } from 'next/navigation';

// The /points surface was merged into /how-it-works as the `#points` section.
// 308 preserves existing share links and SEO rank.
export default function PointsLegacyRedirect(): never {
  permanentRedirect('/how-it-works#points');
}

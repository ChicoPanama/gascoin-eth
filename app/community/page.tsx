import { permanentRedirect } from 'next/navigation';

// The /community feed is now the "Recent" tab on /leaderboard.
// 308 preserves existing share links and SEO rank.
export default function CommunityLegacyRedirect(): never {
  permanentRedirect('/leaderboard?view=recent');
}

'use client';

import { Nav } from '../../components/Nav';
import { ReferralDashboard } from '../../components/referral/ReferralDashboard';

// Dedicated page keeps the URL alive for external share links. The full
// dashboard content lives in ReferralDashboard so /me can embed the same
// surface without duplicating code.
export default function ReferralPage() {
  return (
    <div className="container">
      <Nav />
      <ReferralDashboard showHeader />
    </div>
  );
}

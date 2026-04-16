'use client';

import { Nav } from '../../components/Nav';
import { SubmitFlow } from '../../components/SubmitFlow';
import { ChatAgent } from '../../components/ChatAgent';

// SECURITY: SubmitTestPanel removed from production — exposed window globals
// and allowed state manipulation. Hardened 2026-04-06.

export default function SubmitPage() {
  return (
    <div className="container">
      <Nav />
      <SubmitFlow />
      <ChatAgent autoOpen />
    </div>
  );
}

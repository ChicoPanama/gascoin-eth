'use client';

import { Nav } from '../../components/Nav';
import { SubmitFlow } from '../../components/SubmitFlow';
import { SubmitTestPanel } from '../../components/SubmitTestPanel';

export default function SubmitPage() {
  return (
    <div className="container">
      <Nav />
      <SubmitFlow />
      <SubmitTestPanel />
    </div>
  );
}

import type { Metadata } from 'next';
import { Nav } from '../../components/Nav';
import { SubmitFlow } from '../../components/SubmitFlow';

export const metadata: Metadata = {
  title: 'Submit Gas Receipt · GASCOIN',
  description:
    'Upload your gas receipt, post proof on X, and claim an ETH refund. Every submission passes through an 18-gate verification pipeline.',
  openGraph: {
    title: 'Submit Gas Receipt · GASCOIN',
    description:
      'Real gasoline, real ETH refunds. Upload a receipt, post a tweet, watch the verification pipeline approve or reject in minutes.',
  },
};

export default function SubmitPage() {
  return (
    <div className="container">
      <Nav />
      <SubmitFlow />
    </div>
  );
}

'use client';

import { Nav } from '../../components/Nav';
import dynamic from 'next/dynamic';

const PrivySubmit = dynamic(
  () => import('../../components/PrivySubmit').then((m) => m.PrivySubmit),
  { ssr: false, loading: () => <p>Loading login...</p> }
);

export default function SubmitPage(){
  return <>
    <Nav />
    <h2>Submit Claim</h2>
    <p>Privy login + X verified required. Tweet must include #gascoin and remain live. Receipt must include #gascoin and matching wallet address.</p>
    <PrivySubmit />
  </>;
}

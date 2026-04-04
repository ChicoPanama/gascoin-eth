'use client';

import { Nav } from '../../components/Nav';
import dynamic from 'next/dynamic';

const PrivySubmit = dynamic(
  () => import('../../components/PrivySubmit').then((m) => m.PrivySubmit),
  { ssr: false, loading: () => <p style={{color:'var(--muted)'}}>Loading...</p> }
);

export default function SubmitPage(){
  return <>
    <Nav />
    <h2>Submit Claim</h2>
    <div className="card" style={{marginBottom:24}}>
      <div className="k" style={{marginBottom:8}}>Requirements</div>
      <ul style={{margin:0,paddingLeft:20,fontSize:14,color:'var(--muted)',lineHeight:1.8}}>
        <li>Sign in with your verified X account</li>
        <li>Tweet must include <strong style={{color:'var(--accent)'}}>#gascoin</strong> and remain live</li>
        <li>Receipt must show <strong style={{color:'var(--accent)'}}>#gascoin</strong> and your wallet address</li>
        <li>Wallet must hold at least $1 worth of GASCOIN</li>
      </ul>
    </div>
    <PrivySubmit />
  </>;
}

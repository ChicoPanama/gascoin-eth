import { Nav } from '../components/Nav';
import { LiveTreasuryBar } from '../components/LiveTreasuryBar';
import Link from 'next/link';
export default async function Home(){
  return <>
    <Nav />
    <div className="hero">
      <h1><span>GASCOIN</span> — Community Gas Refunds</h1>
      <p className="hero-sub">Post #gascoin on X, submit a verified gas receipt, and receive a SOL refund once all verification gates pass.</p>
    </div>
    <LiveTreasuryBar />
    <div className="section">
      <h3>How It Works</h3>
      <div className="grid cards-3">
        <div className="card">
          <div className="k">Step 1</div>
          <div className="v" style={{fontSize:18}}>Tweet #gascoin</div>
          <p style={{marginTop:8,fontSize:13}}>Post a tweet with the #gascoin hashtag from your verified X account.</p>
        </div>
        <div className="card">
          <div className="k">Step 2</div>
          <div className="v" style={{fontSize:18}}>Submit Receipt</div>
          <p style={{marginTop:8,fontSize:13}}>Upload your gas receipt photo with your wallet address written on it.</p>
        </div>
        <div className="card">
          <div className="k">Step 3</div>
          <div className="v" style={{fontSize:18}}>Get SOL Back</div>
          <p style={{marginTop:8,fontSize:13}}>Once all 10 verification gates pass, SOL is sent directly to your wallet.</p>
        </div>
      </div>
    </div>
    <div style={{marginTop:32}}>
      <Link className="btn btn-primary" href="/submit">Submit Receipt</Link>
    </div>
  </>;
}

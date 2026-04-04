import { Nav } from '../components/Nav';
import { LiveTreasuryBar } from '../components/LiveTreasuryBar';
import Link from 'next/link';
export default async function Home(){
  return <>
    <Nav />
    <h1>GASCOIN — Community Gas Refunds</h1>
    <p>Post #gascoin, submit a verified receipt, and receive SOL refund once all gates pass.</p>
    <LiveTreasuryBar />
    <div className="grid cards-4">
      <div className="card"><div className="k">Claims Approved</div><div className="v">--</div></div>
      <div className="card"><div className="k">Claims Pending</div><div className="v">--</div></div>
      <div className="card"><div className="k">Total Refunded</div><div className="v">--</div></div>
      <div className="card"><div className="k">Avg Payout Time</div><div className="v">--</div></div>
    </div>
    <div style={{marginTop:20}}>
      <Link className="btn" href="/submit">Submit Receipt</Link>
    </div>
  </>;
}

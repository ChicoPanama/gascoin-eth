export async function LiveTreasuryBar(){
  const [treasury, market] = await Promise.all([
    fetch(process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/public/treasury` : 'http://localhost:3000/api/public/treasury', { cache:'no-store' }).then(r=>r.json()).catch(()=>({ treasuryUsd:'--', refundCapacity:'--'})),
    fetch(process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/public/market` : 'http://localhost:3000/api/public/market', { cache:'no-store' }).then(r=>r.json()).catch(()=>({ marketCapUsd:'--', volume24hUsd:'--'}))
  ]);
  return <div className="card" style={{marginBottom:16}}>
    <div className="grid cards-4">
      <div><div className="k">Treasury USD</div><div className="v">${treasury.treasuryUsd}</div></div>
      <div><div className="k">Refund Capacity</div><div className="v">{treasury.refundCapacity}</div></div>
      <div><div className="k">Market Cap</div><div className="v">${market.marketCapUsd}</div></div>
      <div><div className="k">24h Volume</div><div className="v">${market.volume24hUsd}</div></div>
    </div>
  </div>
}

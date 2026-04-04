export default function WalletLoading() {
  return (
    <div className="container" style={{ paddingTop: 80 }}>
      <div className="lb-skeleton" style={{ width: 300, height: 48, marginBottom: 24 }} />
      <div className="lb-skeleton" style={{ width: '100%', height: 80, marginBottom: 24 }} />
      <div className="lb-skeleton" style={{ width: '100%', height: 120, marginBottom: 24 }} />
      <div className="lb-skeleton" style={{ width: '100%', height: 400 }} />
    </div>
  );
}

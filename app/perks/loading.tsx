export default function PerksLoading() {
  return (
    <div className="container" style={{ paddingTop: 80 }}>
      <div className="lb-skeleton" style={{ width: 250, height: 48, marginBottom: 24 }} />
      <div className="lb-skeleton" style={{ width: '100%', height: 200, marginBottom: 24 }} />
      <div className="lb-skeleton" style={{ width: '100%', height: 400 }} />
    </div>
  );
}

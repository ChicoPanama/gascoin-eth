const base = process.argv[2] || process.env.NEXT_PUBLIC_BASE_URL;
if (!base) {
  console.error('Usage: node scripts/phase0_smoke.mjs <baseUrl>');
  process.exit(1);
}

const paths = [
  '/',
  '/submit',
  '/admin',
  '/api/public/claims',
  '/api/public/market',
  '/api/public/treasury'
];

async function check(url) {
  try {
    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    return { url, ok: r.ok, status: r.status };
  } catch (e) {
    return { url, ok: false, status: 0, error: String(e?.message || e) };
  }
}

const results = [];
for (const p of paths) {
  const url = `${base.replace(/\/$/, '')}${p}`;
  // eslint-disable-next-line no-await-in-loop
  results.push(await check(url));
}

const pass = results.every((r) => r.ok);
console.log(JSON.stringify({ base, pass, results }, null, 2));
if (!pass) process.exit(2);

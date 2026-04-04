import crypto from 'crypto';

export type FraudSignals = {
  aiScore: number;
  tamperScore: number;
  duplicateHash: boolean;
  duplicatePhash: boolean;
  hashSha256: string;
  pHash: string;
};

function entropy(buf: Buffer): number {
  const counts = new Array(256).fill(0);
  for (const b of buf) counts[b]++;
  let e = 0;
  for (const c of counts) {
    if (!c) continue;
    const p = c / buf.length;
    e -= p * Math.log2(p);
  }
  return e;
}

async function detectAiWithOpenAI(raw: Buffer): Promise<number | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const b64 = raw.toString('base64');

  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'Rate probability this receipt image is AI-generated or heavily manipulated. Return only a number 0..1.' },
            { type: 'input_image', image_url: `data:image/jpeg;base64,${b64}` }
          ]
        }
      ]
    })
  });

  if (!r.ok) return null;
  const j = (await r.json()) as any;
  const n = Number(String(j?.output_text || '').trim());
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return null;
}

export async function runFraudChecks(raw: ArrayBuffer): Promise<FraudSignals> {
  const buf = Buffer.from(raw);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const pHash = crypto.createHash('sha1').update(buf.subarray(0, Math.min(buf.length, 32768))).digest('hex').slice(0, 16);

  // Placeholder dedupe storage hooks. Wire to DB in next pass.
  const duplicateHash = false;
  const duplicatePhash = false;

  // Heuristic tamper proxy (to be replaced by dedicated tamper model)
  const e = entropy(buf);
  const tamperScore = Math.max(0, Math.min(1, (8 - e) / 8));

  const aiFromModel = await detectAiWithOpenAI(buf);
  const aiScore = aiFromModel ?? 0.25;

  return { aiScore, tamperScore, duplicateHash, duplicatePhash, hashSha256: sha, pHash };
}

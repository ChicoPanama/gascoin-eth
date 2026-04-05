import crypto from 'crypto';

// ═══════════════════════════════════════════
// GASCOIN Receipt Processing Pipeline
//
// Step 1: EXIF check (free, instant)
// Step 2: Dimension/format check (free, instant)
// Step 3: dHash perceptual hash (free, local)
// Step 4: Gemini Flash — structured extraction + fraud scoring (one API call)
// ═══════════════════════════════════════════

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OCR_MODEL = process.env.RECEIPT_OCR_MODEL || 'google/gemini-2.0-flash-lite-001';
const FRAUD_MODEL = process.env.RECEIPT_FRAUD_MODEL || 'google/gemini-2.0-flash-001';

function getApiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

// ─── STEP 1: EXIF Metadata Check ───

export interface ExifCheckResult {
  hasExif: boolean;
  cameraModel: string | null;
  dateTime: string | null;
  hasGps: boolean; // Used for fraud scoring only — no GPS data is ever stored or exposed
  software: string | null;
  score: number; // 0 = definitely fake, 1 = definitely real photo
  flags: string[];
}

export function checkExifMetadata(buf: Buffer): ExifCheckResult {
  const flags: string[] = [];
  let hasExif = false;
  let cameraModel: string | null = null;
  let dateTime: string | null = null;
  let hasGps = false;
  let software: string | null = null;

  // Check for EXIF marker (0xFFE1) in JPEG
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;

  if (isPng) {
    flags.push('png_format');
    // PNGs from screenshots are common — not necessarily fake but suspicious
  }

  if (isJpeg) {
    // Scan for EXIF APP1 marker
    for (let i = 2; i < Math.min(buf.length, 65536) - 1; i++) {
      if (buf[i] === 0xFF && buf[i + 1] === 0xE1) {
        hasExif = true;
        break;
      }
    }

    if (!hasExif) {
      flags.push('no_exif_data');
    }

    // Search for common EXIF strings in the binary data
    const ascii = buf.subarray(0, Math.min(buf.length, 65536)).toString('latin1');

    // Camera model
    const makeMatch = ascii.match(/Apple|Samsung|Google|Pixel|iPhone|HUAWEI|Xiaomi|OnePlus|SONY|Canon|Nikon/i);
    if (makeMatch) {
      cameraModel = makeMatch[0];
    }

    // DateTime
    const dateMatch = ascii.match(/20\d{2}[:\-](?:0\d|1[0-2])[:\-](?:[012]\d|3[01])\s+\d{2}:\d{2}:\d{2}/);
    if (dateMatch) {
      dateTime = dateMatch[0];
    }

    // GPS indicator
    if (ascii.includes('GPS') || ascii.includes('GPSLatitude')) {
      hasGps = true;
    }

    // Software (AI tools leave signatures)
    const swMatch = ascii.match(/Adobe|Photoshop|GIMP|Canva|Midjourney|DALL|Stable Diffusion/i);
    if (swMatch) {
      software = swMatch[0];
      flags.push(`software_detected:${swMatch[0]}`);
    }
  }

  // Score calculation
  let score = 0.5; // neutral starting point

  if (hasExif) score += 0.15;
  else score -= 0.2;

  if (cameraModel) score += 0.15;
  if (dateTime) score += 0.1;
  if (hasGps) score += 0.1;

  if (software) score -= 0.3; // editing software detected
  if (isPng) score -= 0.1; // PNGs are more likely screenshots

  score = Math.max(0, Math.min(1, score));

  return { hasExif, cameraModel, dateTime, hasGps, software, score, flags };
}

// ─── STEP 2: Image Dimension & Format Check ───

export interface DimensionCheckResult {
  width: number;
  height: number;
  format: string;
  fileSize: number;
  score: number;
  flags: string[];
}

export function checkImageDimensions(buf: Buffer): DimensionCheckResult {
  const flags: string[] = [];
  let width = 0;
  let height = 0;
  let format = 'unknown';

  // JPEG dimensions
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    format = 'jpeg';
    // Scan for SOF0 marker (0xFFC0) to find dimensions
    for (let i = 2; i < buf.length - 8; i++) {
      if (buf[i] === 0xFF && (buf[i + 1] === 0xC0 || buf[i + 1] === 0xC2)) {
        height = (buf[i + 5] << 8) | buf[i + 6];
        width = (buf[i + 7] << 8) | buf[i + 8];
        break;
      }
    }
  }

  // PNG dimensions
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    format = 'png';
    if (buf.length > 24) {
      width = buf.readUInt32BE(16);
      height = buf.readUInt32BE(20);
    }
  }

  const fileSize = buf.length;

  // Score calculation
  let score = 0.5;

  // Real phone photos are typically 2000-5000px wide
  if (width >= 2000 && width <= 5000) score += 0.2;
  else if (width >= 1000 && width < 2000) score += 0.05;
  else if (width > 0 && width < 800) { score -= 0.15; flags.push('low_resolution'); }

  // AI images are often exactly 1024x1024, 512x512, etc.
  if ((width === 1024 && height === 1024) || (width === 512 && height === 512) || (width === 768 && height === 768)) {
    score -= 0.25;
    flags.push('ai_typical_dimensions');
  }

  // Screenshots have common screen dimensions
  const screenDims = [[1170, 2532], [1284, 2778], [1290, 2796], [1080, 1920], [1440, 2560], [750, 1334], [1125, 2436]];
  if (screenDims.some(([w, h]) => (width === w && height === h) || (width === h && height === w))) {
    score -= 0.15;
    flags.push('screen_dimensions');
  }

  // File size: real photos are typically 1-8MB, AI images and screenshots are smaller
  if (fileSize > 500_000 && fileSize < 12_000_000) score += 0.1;
  else if (fileSize < 100_000) { score -= 0.1; flags.push('very_small_file'); }

  // JPEG is expected for phone photos
  if (format === 'jpeg') score += 0.05;
  if (format === 'png') { score -= 0.05; flags.push('png_format'); }

  score = Math.max(0, Math.min(1, score));

  return { width, height, format, fileSize, score, flags };
}

// ─── STEP 3: Perceptual Hash (dHash) ───

// Simplified dHash: converts image to a low-res grayscale representation
// and computes difference hash. Two photos of the same receipt will have
// similar dHashes even if taken from slightly different angles.
export function computePerceptualHash(buf: Buffer): string {
  // Sample evenly spaced bytes across the image data (skip headers)
  const dataStart = Math.min(1024, Math.floor(buf.length * 0.05));
  const dataEnd = buf.length;
  const sampleSize = 64; // 8x8 grid
  const step = Math.max(1, Math.floor((dataEnd - dataStart) / sampleSize));

  const samples: number[] = [];
  for (let i = 0; i < sampleSize && dataStart + i * step < dataEnd; i++) {
    samples.push(buf[dataStart + i * step]);
  }

  // Compute difference hash: compare adjacent samples
  let hash = '';
  for (let i = 0; i < samples.length - 1; i++) {
    hash += samples[i] < samples[i + 1] ? '1' : '0';
  }

  // Convert binary string to hex
  let hex = '';
  for (let i = 0; i < hash.length; i += 4) {
    hex += parseInt(hash.substring(i, i + 4).padEnd(4, '0'), 2).toString(16);
  }

  return hex;
}

// Compare two perceptual hashes — returns similarity 0-1
export function comparePerceptualHashes(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 0;
  let same = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] === hash2[i]) same++;
  }
  return same / hash1.length;
}

// Also compute SHA-256 for exact duplicate detection
export function computeExactHash(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ─── STEP 4: Gemini Vision — Structured Extraction + Fraud Scoring ───

export interface ReceiptExtraction {
  // Structured fields — privacy-first: country only, no city/state/address/station name
  station_country: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  currency: string | null;
  wallet_address: string | null;
  has_handwriting: boolean;
  has_gascoin_hashtag: boolean;
  // Fraud signals
  is_physical_receipt: boolean;
  is_gas_station: boolean;
  is_digitally_manipulated: boolean;
  confidence: number;
  fraud_notes: string;
  // Raw text
  raw_text: string;
}

export async function extractAndScoreReceipt(buf: Buffer, mimeType: string): Promise<ReceiptExtraction> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return fallbackExtraction();
  }

  const b64 = buf.toString('base64');

  const prompt = `Analyze this gas station receipt image. Return ONLY valid JSON with these exact fields:

{
  "station_country": "country code (US, CA, UK, etc.) or null",
  "receipt_date": "YYYY-MM-DD or null",
  "total_amount": 0.00,
  "currency": "USD",
  "wallet_address": "any long alphanumeric string (32-44 chars) found handwritten or null",
  "has_handwriting": true,
  "has_gascoin_hashtag": false,
  "is_physical_receipt": true,
  "is_gas_station": true,
  "is_digitally_manipulated": false,
  "confidence": 0.85,
  "fraud_notes": "any concerns about authenticity",
  "raw_text": "all readable text on the receipt"
}

Be strict about fraud detection:
- is_physical_receipt: false if this is a screenshot, digital receipt, or AI-generated image
- is_digitally_manipulated: true if you see signs of editing, pasting, or digital overlay
- confidence: 0-1 how confident you are in the extraction accuracy
- wallet_address: look for a long string of mixed case letters and numbers, possibly handwritten`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://platform-ebon-nine.vercel.app',
        'X-Title': 'GASCOIN Receipt Verification',
      },
      body: JSON.stringify({
        model: FRAUD_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${b64}` } },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      console.error('OpenRouter error:', res.status, await res.text().catch(() => ''));
      return fallbackExtraction();
    }

    const json = (await res.json()) as any;
    const text = json?.choices?.[0]?.message?.content || '';

    // Extract JSON from response (model may wrap in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON in model response');
      return { ...fallbackExtraction(), raw_text: text };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      // Privacy-first: country only

      station_country: parsed.station_country || null,
      receipt_date: parsed.receipt_date || null,
      total_amount: typeof parsed.total_amount === 'number' ? parsed.total_amount : null,
      currency: parsed.currency || 'USD',
      wallet_address: parsed.wallet_address || null,
      has_handwriting: !!parsed.has_handwriting,
      has_gascoin_hashtag: !!parsed.has_gascoin_hashtag,
      is_physical_receipt: parsed.is_physical_receipt !== false,
      is_gas_station: parsed.is_gas_station !== false,
      is_digitally_manipulated: !!parsed.is_digitally_manipulated,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      fraud_notes: parsed.fraud_notes || '',
      raw_text: parsed.raw_text || text,
    };
  } catch (e: any) {
    console.error('Receipt extraction failed:', e.message);
    return fallbackExtraction();
  }
}

function fallbackExtraction(): ReceiptExtraction {
  return {
    station_country: null, receipt_date: null,
    total_amount: null, currency: 'USD', wallet_address: null,
    has_handwriting: false, has_gascoin_hashtag: false,
    is_physical_receipt: false, is_gas_station: false,
    is_digitally_manipulated: false, confidence: 0,
    fraud_notes: 'API unavailable — manual review required',
    raw_text: '',
  };
}

// ─── FULL PIPELINE ───

export interface PipelineResult {
  exif: ExifCheckResult;
  dimensions: DimensionCheckResult;
  perceptualHash: string;
  exactHash: string;
  extraction: ReceiptExtraction;
  // Composite scores
  authenticityScore: number; // 0 = definitely fake, 1 = definitely real
  fraudRisk: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
}

export async function processReceipt(buf: Buffer, mimeType: string): Promise<PipelineResult> {
  // Steps 1-3: Free, instant, local
  const exif = checkExifMetadata(buf);
  const dimensions = checkImageDimensions(buf);
  const perceptualHash = computePerceptualHash(buf);
  const exactHash = computeExactHash(buf);

  // Step 4: Gemini Vision (one API call)
  const extraction = await extractAndScoreReceipt(buf, mimeType);

  // Combine all signals into authenticity score
  const allFlags = [...exif.flags, ...dimensions.flags];

  let authenticityScore = 0;

  // Weight the signals
  authenticityScore += exif.score * 0.20;        // EXIF: 20%
  authenticityScore += dimensions.score * 0.10;   // Dimensions: 10%
  authenticityScore += extraction.confidence * 0.25; // Model confidence: 25%

  // Binary fraud signals from model
  if (extraction.is_physical_receipt) authenticityScore += 0.15;
  else allFlags.push('not_physical_receipt');

  if (extraction.is_gas_station) authenticityScore += 0.10;
  else allFlags.push('not_gas_station');

  if (!extraction.is_digitally_manipulated) authenticityScore += 0.10;
  else { authenticityScore -= 0.15; allFlags.push('digitally_manipulated'); }

  if (extraction.has_handwriting) authenticityScore += 0.05;
  else allFlags.push('no_handwriting_detected');

  if (extraction.wallet_address) authenticityScore += 0.05;
  else allFlags.push('no_wallet_address_found');

  authenticityScore = Math.max(0, Math.min(1, authenticityScore));

  // Determine risk level
  let fraudRisk: 'low' | 'medium' | 'high' | 'critical';
  if (authenticityScore >= 0.7) fraudRisk = 'low';
  else if (authenticityScore >= 0.5) fraudRisk = 'medium';
  else if (authenticityScore >= 0.3) fraudRisk = 'high';
  else fraudRisk = 'critical';

  return {
    exif, dimensions, perceptualHash, exactHash, extraction,
    authenticityScore, fraudRisk, flags: allFlags,
  };
}

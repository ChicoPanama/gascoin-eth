import crypto from 'crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { generateAIJsonVision, isAiGatewayAvailable, AI_MODELS } from './ai-gateway';
import { cacheGet, cacheSet } from '../cache';
import { getSystemPrompt, PROMPT_KEYS } from '../prompts';
import { writeIntelligence } from '../knowledge-base';

// ═══════════════════════════════════════════
// GASCOIN Receipt Processing Pipeline
//
// Step 1: EXIF check (free, instant)
// Step 2: Dimension/format check (free, instant)
// Step 3: dHash perceptual hash (free, local)
// Step 4: Gemini Vision — structured extraction + fraud scoring (one AI call)
//         Routed through Vercel AI Gateway with:
//           - Provider-native Gemini caching (automatic)
//           - Upstash SHA256 exact-match dedup (7d) → identical uploads skip AI
//           - Tags for cost attribution in Vercel dashboard
// ═══════════════════════════════════════════

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

// dHash: resize to 9×8 grayscale, compare each pixel to its right neighbour.
// 8 columns × 8 rows = 64 bits → 16-char hex.
// Two photos of the same receipt hash to values with low Hamming distance
// even if taken at slightly different angles or with minor crops.
export async function computePerceptualHash(buf: Buffer): Promise<string> {
  try {
    const { data } = await sharp(buf)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let bits = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const idx = row * 9 + col;
        bits += data[idx] < data[idx + 1] ? '1' : '0';
      }
    }

    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return '0'.repeat(16);
  }
}

// Bit-count lookup for 4-bit values (nibbles)
const POPCOUNT4 = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

// Compare two 16-char hex dHashes — returns similarity 0-1 using Hamming distance.
// 1.0 = identical image content; 0.0 = completely different.
export function comparePerceptualHashes(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length || hash1.length === 0) return 0;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    distance += POPCOUNT4[xor];
  }
  return 1 - distance / (hash1.length * 4);
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
  // Set to true when Gemini was unavailable and heuristics-only fallback fired.
  // Callers check this to distinguish "OCR failed" from "OCR ran but low confidence".
  ocr_fallback?: boolean;
}

// Zod schema — the AI Gateway enforces this structure via Output.object().
// Privacy-first: country only, no city/state/station name.
const ReceiptSchema = z.object({
  station_country: z.string().nullable().describe('country code (US, CA, UK, etc.) or null'),
  receipt_date: z.string().nullable().describe('YYYY-MM-DD or null'),
  total_amount: z.number().nullable(),
  currency: z.string().default('USD'),
  wallet_address: z
    .string()
    .nullable()
    .describe('any long alphanumeric string (32-44 chars) found handwritten or null'),
  has_handwriting: z.boolean(),
  has_gascoin_hashtag: z.boolean(),
  is_physical_receipt: z.boolean().describe('false if screenshot, digital receipt, or AI-generated'),
  is_gas_station: z.boolean(),
  is_digitally_manipulated: z.boolean().describe('true if edited, pasted, or overlaid'),
  confidence: z.number().min(0).max(1).describe('0-1 confidence in extraction accuracy'),
  fraud_notes: z.string(),
  raw_text: z.string().describe('all readable text on the receipt'),
});

// Gemini Vision timeout — fall back to heuristics-only if the call hangs.
const GEMINI_TIMEOUT_MS = 30_000;

async function doReceiptExtraction(buf: Buffer, mimeType: string): Promise<ReceiptExtraction> {
  if (!isAiGatewayAvailable()) {
    return fallbackExtraction();
  }

  // System prompt is Edge-Config-backed so it can be tuned live without a
  // redeploy. Falls back to bundled default from lib/prompts.ts.
  const systemPrompt = await getSystemPrompt(PROMPT_KEYS.GEMINI_RECEIPT);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const result = await generateAIJsonVision(ReceiptSchema, {
      model: AI_MODELS.GEMINI_VISION,
      system: systemPrompt,
      prompt:
        'Extract structured data from this gas-station receipt and detect fraud signals. Return the JSON object only.',
      image: buf,
      mimeType: mimeType || 'image/jpeg',
      maxTokens: 1200,
      temperature: 0,
      fallbackModels: [AI_MODELS.GEMINI_FAST, 'google/gemini-2.5-flash'],
      tags: ['feature:receipt-ocr', 'pipeline:submit'],
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!result.ok) {
      writeIntelligence({
        entry_type: 'gemini_vision_error',
        entity_type: 'system',
        entity_id: 'receipt_pipeline',
        summary: `Gemini Vision extraction failed: ${(result.error ?? '').slice(0, 200)}`,
        detail_json: { mimeType },
        severity: 'high',
        pipeline_source: 'receipt_pipeline',
      }).catch(() => {});
      return fallbackExtraction();
    }
    return result.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      writeIntelligence({
        entry_type: 'gemini_vision_timeout',
        entity_type: 'system',
        entity_id: 'receipt_pipeline',
        summary: `Gemini Vision timed out after ${GEMINI_TIMEOUT_MS}ms`,
        detail_json: { mimeType },
        severity: 'high',
        pipeline_source: 'receipt_pipeline',
      }).catch(() => {});
    } else {
      writeIntelligence({
        entry_type: 'gemini_vision_error',
        entity_type: 'system',
        entity_id: 'receipt_pipeline',
        summary: `Gemini Vision threw: ${String(err instanceof Error ? err.message : err).slice(0, 200)}`,
        detail_json: { mimeType },
        severity: 'high',
        pipeline_source: 'receipt_pipeline',
      }).catch(() => {});
    }
    return fallbackExtraction();
  }
}

export async function extractAndScoreReceipt(
  buf: Buffer,
  mimeType: string,
  sha256?: string,
): Promise<ReceiptExtraction> {
  // Upstash exact-match dedup by SHA256: identical uploads skip the AI call
  // entirely (7d TTL). sha256 may be passed in from processReceipt to avoid
  // computing it twice.
  const hash = sha256 ?? computeExactHash(buf);
  const key = `receipt:extract:${hash}`;

  const cached = await cacheGet<ReceiptExtraction>(key);
  if (cached !== null) return cached;

  const result = await doReceiptExtraction(buf, mimeType);
  // Never cache fallback results — a 7-day cache of ocr_fallback:true would
  // permanently degrade that image hash during an outage window.
  if (!result.ocr_fallback) {
    cacheSet(key, result, 7 * 24 * 60 * 60).catch(() => {});
  }
  return result;
}

export function fallbackExtraction(): ReceiptExtraction {
  return {
    station_country: null, receipt_date: null,
    total_amount: null, currency: 'USD', wallet_address: null,
    has_handwriting: false, has_gascoin_hashtag: false,
    is_physical_receipt: false, is_gas_station: false,
    is_digitally_manipulated: false, confidence: 0,
    fraud_notes: 'API unavailable — manual review required',
    raw_text: '',
    ocr_fallback: true,
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
  const exactHash = computeExactHash(buf);
  const perceptualHash = await computePerceptualHash(buf);

  // Step 4: Gemini Vision (one API call). Pass pre-computed hash to avoid
  // computing SHA-256 a second time inside extractAndScoreReceipt.
  const extraction = await extractAndScoreReceipt(buf, mimeType, exactHash);

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

  // Award +0.10 for unmanipulated images; manipulation is already captured as
  // a flag and weighed down via reduced authenticityScore contributions above —
  // no additional score deduction here to avoid double-penalising a single signal.
  if (!extraction.is_digitally_manipulated) authenticityScore += 0.10;
  else allFlags.push('digitally_manipulated');

  if (extraction.has_handwriting) authenticityScore += 0.05;
  else allFlags.push('no_handwriting_detected');

  if (extraction.wallet_address) authenticityScore += 0.05;
  else allFlags.push('no_wallet_address_found');

  if (!extraction.has_gascoin_hashtag) allFlags.push('no_gascoin_hashtag');

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

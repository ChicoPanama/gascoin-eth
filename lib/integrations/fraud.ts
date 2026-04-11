import {
  computeExactHash,
  computePerceptualHash,
  checkExifMetadata,
  checkImageDimensions,
  type PipelineResult,
} from './receipt-pipeline';
import { callGrok, isGrokAvailable } from './grok';

export type FraudSignals = {
  aiScore: number;
  tamperScore: number;
  duplicateHash: boolean;
  duplicatePhash: boolean;
  hashSha256: string;
  pHash: string;
  authenticityScore: number;
  fraudRisk: string;
  exifScore: number;
  dimensionScore: number;
  flags: string[];
  crossValidation: CrossValidationResult | null;
};

export type CrossValidationResult = {
  fraudRiskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  reasoning: string;
  concerns: string[];
};

function buildFraudPrompt(signals: {
  aiScore: number;
  tamperScore: number;
  exifScore: number;
  dimensionScore: number;
  flags: string[];
  ocrConfidence?: number;
  isPhysicalReceipt?: boolean;
  isDigitallyManipulated?: boolean;
  country?: string;
}): string {
  return `You are a fraud analyst for a gas receipt refund protocol. Analyze these signals and determine the fraud risk level.

SIGNALS:
- AI generation score: ${signals.aiScore.toFixed(3)} (0=real, 1=AI-generated, threshold: 0.65)
- Tamper score: ${signals.tamperScore.toFixed(3)} (0=clean, 1=tampered, threshold: 0.55)
- EXIF metadata score: ${signals.exifScore.toFixed(2)} (1=real camera EXIF present, 0=stripped/missing)
- Image dimension score: ${signals.dimensionScore.toFixed(2)} (1=real photo dimensions, 0=suspicious AI dimensions)
- OCR confidence: ${signals.ocrConfidence?.toFixed(2) ?? 'unknown'}
- Is physical receipt: ${signals.isPhysicalReceipt ?? 'unknown'}
- Digitally manipulated: ${signals.isDigitallyManipulated ?? 'unknown'}
- Country: ${signals.country ?? 'unknown'}
- Flags: ${signals.flags.length > 0 ? signals.flags.join(', ') : 'none'}

Respond ONLY with valid JSON:
{"fraudRiskLevel":"low|medium|high","confidence":0.0-1.0,"reasoning":"one sentence","concerns":["list","of","specific","concerns"]}`;
}

function parseFraudResponse(text: string): CrossValidationResult {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    fraudRiskLevel: parsed.fraudRiskLevel || 'medium',
    confidence: Number(parsed.confidence) || 0.5,
    reasoning: String(parsed.reasoning || ''),
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
  };
}

async function aiFraudAnalysis(signals: {
  aiScore: number;
  tamperScore: number;
  exifScore: number;
  dimensionScore: number;
  flags: string[];
  ocrConfidence?: number;
  isPhysicalReceipt?: boolean;
  isDigitallyManipulated?: boolean;
  country?: string;
}): Promise<CrossValidationResult> {
  const prompt = buildFraudPrompt(signals);

  // Use Grok for cross-signal fraud REASONING (not image analysis — Gemini handles that)
  if (isGrokAvailable()) {
    try {
      const grokRes = await callGrok(prompt, {
        temperature: 0.1,
        maxTokens: 300,
        systemPrompt: 'You are a fraud reasoning engine. You receive pre-computed signals from image analysis (Gemini) and social verification (X API). Your job is to reason about whether the COMBINATION of signals indicates fraud. Respond only with valid JSON.',
      });
      if (grokRes.ok && grokRes.content) {
        const result = parseFraudResponse(grokRes.content);
        result.reasoning = `[grok] ${result.reasoning}`;
        return result;
      }
    } catch {
      // Fall through to Gemini reasoning fallback
    }
  }

  // Fallback: Use Gemini for reasoning too (less ideal but functional)
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const model = process.env.RECEIPT_FRAUD_MODEL || 'google/gemini-2.0-flash-001';
  if (!apiKey) return { fraudRiskLevel: 'medium', confidence: 0.5, reasoning: 'No reasoning engine available', concerns: ['no_api_key'] };

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 200 }),
      cache: 'no-store',
    });

    if (!res.ok) return { fraudRiskLevel: 'medium', confidence: 0.5, reasoning: 'Gemini reasoning fallback error', concerns: ['api_error'] };
    const json = await res.json() as any;
    const text = json?.choices?.[0]?.message?.content || '';
    const result = parseFraudResponse(text);
    result.reasoning = `[gemini-fallback] ${result.reasoning}`;
    return result;
  } catch {
    return { fraudRiskLevel: 'medium', confidence: 0.5, reasoning: 'All reasoning engines failed', concerns: ['all_engines_failed'] };
  }
}

export async function runFraudChecks(raw: ArrayBuffer, pipeline?: PipelineResult): Promise<FraudSignals> {
  const buf = Buffer.from(raw);

  // Use pipeline data if available (already computed in OCR step)
  const exactHash = pipeline?.exactHash ?? computeExactHash(buf);
  const pHash = pipeline?.perceptualHash ?? computePerceptualHash(buf);
  const exif = pipeline?.exif ?? checkExifMetadata(buf);
  const dims = pipeline?.dimensions ?? checkImageDimensions(buf);

  // Duplicate detection will be checked against DB by the caller
  const duplicateHash = false;
  const duplicatePhash = false;

  // AI score: combine EXIF + dimension signals + model judgment
  // If pipeline has model data, use it; otherwise use heuristics only
  let aiScore = 0.25; // default neutral
  if (pipeline?.extraction) {
    // Model says it's manipulated
    if (pipeline.extraction.is_digitally_manipulated) aiScore = 0.8;
    // Model says it's not a physical receipt
    else if (!pipeline.extraction.is_physical_receipt) aiScore = 0.7;
    // Model is confident it's real
    else if (pipeline.extraction.confidence > 0.8) aiScore = 0.1;
    else aiScore = 1 - pipeline.extraction.confidence;
  }

  // Tamper score: weighted combination of signals
  let tamperScore = 0;
  tamperScore += (1 - exif.score) * 0.4;   // No EXIF = suspicious
  tamperScore += (1 - dims.score) * 0.3;   // Wrong dimensions = suspicious
  if (pipeline?.extraction?.is_digitally_manipulated) tamperScore += 0.3;
  tamperScore = Math.max(0, Math.min(1, tamperScore));

  const authenticityScore = pipeline?.authenticityScore ?? ((exif.score + dims.score) / 2);
  const fraudRisk = pipeline?.fraudRisk ?? (authenticityScore > 0.6 ? 'low' : authenticityScore > 0.4 ? 'medium' : 'high');
  const flags = [...(exif.flags || []), ...(dims.flags || []), ...(pipeline?.flags || [])];

  // Run AI cross-validation for non-trivial cases
  let crossValidation: CrossValidationResult | null = null;
  if (aiScore > 0.3 || tamperScore > 0.3 || flags.length > 2) {
    crossValidation = await aiFraudAnalysis({
      aiScore,
      tamperScore,
      exifScore: exif.score,
      dimensionScore: dims.score,
      flags,
      ocrConfidence: pipeline?.extraction?.confidence,
      isPhysicalReceipt: pipeline?.extraction?.is_physical_receipt,
      isDigitallyManipulated: pipeline?.extraction?.is_digitally_manipulated,
      country: pipeline?.extraction?.station_country ?? undefined,
    });

    // AI cross-validation can elevate risk if it detects something heuristics missed
    if (crossValidation.fraudRiskLevel === 'high' && crossValidation.confidence > 0.7) {
      aiScore = Math.max(aiScore, 0.6);
      tamperScore = Math.max(tamperScore, 0.5);
    }
  }

  return {
    aiScore,
    tamperScore,
    duplicateHash,
    duplicatePhash,
    hashSha256: exactHash,
    pHash,
    authenticityScore,
    fraudRisk: crossValidation?.fraudRiskLevel ?? fraudRisk,
    exifScore: exif.score,
    dimensionScore: dims.score,
    flags,
    crossValidation,
  };
}

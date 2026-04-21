import { z } from 'zod';
import {
  computeExactHash,
  computePerceptualHash,
  checkExifMetadata,
  checkImageDimensions,
  type PipelineResult,
} from './receipt-pipeline';
import { getSystemPrompt, getThreshold, PROMPT_KEYS, THRESHOLD_KEYS } from '../prompts';
import { generateAIJson, isAiGatewayAvailable, AI_MODELS } from './ai-gateway';
import { writeFraudSignal, addMemory, MEM0_CATEGORIES, MEM0_AGENTS, MEM0_APPS } from '../mem0';
import { writeIntelligence } from '../knowledge-base';

export type FraudSignals = {
  aiScore: number;
  tamperScore: number;
  duplicateHash: boolean;
  duplicatePhash: boolean;
  hashSha256: string;
  pHash: string;
  authenticityScore: number;
  fraudRisk: 'low' | 'medium' | 'high' | 'critical'; // C2: typed union, not string
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

const FraudResultSchema = z.object({
  fraudRiskLevel: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  concerns: z.array(z.string()),
});

// C1: raw_text added so Grok can perform math consistency checks
function buildFraudUserPrompt(signals: {
  aiScore: number;
  tamperScore: number;
  exifScore: number;
  dimensionScore: number;
  flags: string[];
  ocrConfidence?: number;
  isPhysicalReceipt?: boolean;
  isDigitallyManipulated?: boolean;
  country?: string;
  raw_text?: string;
}): string {
  return `Analyze these signals for one submission:

- AI generation score: ${signals.aiScore.toFixed(3)}
- Tamper score: ${signals.tamperScore.toFixed(3)}
- EXIF metadata score: ${signals.exifScore.toFixed(2)}
- Image dimension score: ${signals.dimensionScore.toFixed(2)}
- OCR confidence: ${signals.ocrConfidence?.toFixed(2) ?? 'unknown'}
- Is physical receipt: ${signals.isPhysicalReceipt ?? 'unknown'}
- Digitally manipulated: ${signals.isDigitallyManipulated ?? 'unknown'}
- Country: ${signals.country ?? 'unknown'}
- Flags: ${signals.flags.length > 0 ? signals.flags.join(', ') : 'none'}
- Raw text (for math consistency check): ${signals.raw_text ? signals.raw_text.slice(0, 500) : 'not available'}

Return the verdict JSON.`;
}

// P1-C: userId threaded through for Gateway per-user attribution + rate limiting
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
  raw_text?: string;
}, userId?: string): Promise<CrossValidationResult> {
  if (!isAiGatewayAvailable()) {
    return {
      fraudRiskLevel: 'medium',
      confidence: 0.5,
      reasoning: 'AI reasoning unavailable — heuristic posture preserved',
      concerns: ['ai_unavailable'],
    };
  }

  const systemPrompt = await getSystemPrompt(PROMPT_KEYS.GROK_FRAUD);
  const result = await generateAIJson(FraudResultSchema, {
    model: AI_MODELS.GROK,
    system: systemPrompt,
    prompt: buildFraudUserPrompt(signals),
    maxTokens: 300,
    temperature: 0.1,
    // Gateway edge cache. Fraud signals are deterministic given the same
    // OCR + image + metric inputs; two submissions with identical fraud
    // signal bundles (e.g. a tester resubmitting the same receipt photo
    // after fixing some OTHER gate failure) cache-hit at the edge and
    // return in ms with no Grok billing. 300s (5 min) is the sweet spot:
    // long enough to catch rapid retries during debugging sessions,
    // short enough we don't serve stale verdicts after content changes.
    gatewayCacheSeconds: 300,
    fallbackModels: [AI_MODELS.GEMINI_FAST, 'google/gemini-2.5-flash'],
    tags: ['feature:fraud-reasoning', 'pipeline:submit'],
    userId,
  });

  if (!result.ok) {
    return {
      fraudRiskLevel: 'medium',
      confidence: 0.5,
      reasoning: `AI Gateway error: ${result.error}`,
      concerns: ['gateway_error'],
    };
  }

  return result.data;
}

/**
 * Record high-severity fraud signals to mem0 as a side-effect of fraud
 * checking. Fire-and-forget — never blocks the submission pipeline.
 * Lands in fraud_signals category with a 90-day TTL; recent signals
 * dominate retrieval, old ones decay automatically.
 */
function recordFraudSignalsToMem0(
  wallet: string | undefined,
  claimId: string | undefined,
  signals: {
    aiScore: number;
    tamperScore: number;
    isDigitallyManipulated?: boolean;
    isPhysicalReceipt?: boolean;
    flags: string[];
    crossValidation: CrossValidationResult | null;
  },
): void {
  if (!wallet) return;
  // Only record when the signal is strong — we don't want to flood mem0 with
  // every borderline hit. The fraud_signals category is for actionable risk.
  if (signals.aiScore > 0.65) {
    writeFraudSignal(wallet, {
      name: `aiScore_${signals.aiScore.toFixed(2)}`,
      source: 'gemini_vision',
      severity: signals.aiScore > 0.85 ? 'critical' : 'high',
      detail: 'AI-generation score exceeded threshold 0.65',
      claimId,
    }).catch(() => {});
  }
  if (signals.tamperScore > 0.55) {
    writeFraudSignal(wallet, {
      name: `tamperScore_${signals.tamperScore.toFixed(2)}`,
      source: 'heuristic',
      severity: signals.tamperScore > 0.75 ? 'critical' : 'high',
      detail: 'Tamper score exceeded threshold 0.55',
      claimId,
    }).catch(() => {});
  }
  if (signals.isDigitallyManipulated) {
    writeFraudSignal(wallet, {
      name: 'digitally_manipulated',
      source: 'gemini_vision',
      severity: 'high',
      detail: 'Vision model flagged digital manipulation',
      claimId,
    }).catch(() => {});
  }
  if (signals.isPhysicalReceipt === false) {
    writeFraudSignal(wallet, {
      name: 'not_physical_receipt',
      source: 'gemini_vision',
      severity: 'high',
      detail: 'Vision model classified as screenshot or digital, not paper photo',
      claimId,
    }).catch(() => {});
  }
  if (signals.crossValidation?.fraudRiskLevel === 'high' && signals.crossValidation.confidence > 0.7) {
    writeFraudSignal(wallet, {
      name: `grok_cross_validation_${signals.crossValidation.confidence.toFixed(2)}`,
      source: 'grok_reasoning',
      severity: 'high',
      detail: signals.crossValidation.reasoning.slice(0, 180),
      claimId,
    }).catch(() => {});
    // Write to WALLET_TRUST_TRAJECTORY so repeated Grok overrides surface
    // in Claude's entity profile as a trust-level decline signal.
    addMemory('wallet', wallet,
      `grok_score_elevation | confidence=${signals.crossValidation.confidence.toFixed(2)} | ${signals.crossValidation.reasoning.slice(0, 100)}`,
      {
        category: MEM0_CATEGORIES.WALLET_TRUST_TRAJECTORY,
        agentId: MEM0_AGENTS.GROK_FRAUD,
        appId: MEM0_APPS.SUBMIT,
        metadata: { pipeline: 'grok_fraud', signal: 'score_elevation', severity: 'high' },
      }).catch(() => {});
    // P1-B: write to intelligence_entries so the aggregate-intelligence worker
    // and Claude's prior intel query both see this high-confidence Grok verdict.
    writeIntelligence({
      entry_type: 'grok_fraud_high',
      entity_type: 'wallet',
      entity_id: wallet,
      summary: `Grok cross-validation: HIGH fraud (confidence=${signals.crossValidation.confidence.toFixed(2)}) — ${signals.crossValidation.reasoning.slice(0, 120)}`,
      detail_json: { claimId, confidence: signals.crossValidation.confidence, concerns: signals.crossValidation.concerns },
      severity: 'critical',
      pipeline_source: 'grok_fraud',
    }).catch(() => {});
  }
}

// Risk rank for no-downgrade merge (higher rank wins)
const RISK_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export async function runFraudChecks(raw: ArrayBuffer, pipeline?: PipelineResult, context?: { wallet?: string; claimId?: string }): Promise<FraudSignals> {
  // Thresholds read from Edge Config at request time — tunable without redeployment.
  const [AI_SCORE_THRESHOLD, TAMPER_SCORE_THRESHOLD, FLAGS_THRESHOLD] = await Promise.all([
    getThreshold(THRESHOLD_KEYS.AI_SCORE, 0.3),
    getThreshold(THRESHOLD_KEYS.TAMPER_SCORE, 0.3),
    getThreshold(THRESHOLD_KEYS.FLAGS_COUNT, 2),
  ]);

  const buf = Buffer.from(raw);

  // Use pipeline data if available (already computed in OCR step)
  const exactHash = pipeline?.exactHash ?? computeExactHash(buf);
  const pHash = pipeline?.perceptualHash ?? await computePerceptualHash(buf);
  const exif = pipeline?.exif ?? checkExifMetadata(buf);
  const dims = pipeline?.dimensions ?? checkImageDimensions(buf);

  // Duplicate detection will be checked against DB by the caller
  const duplicateHash = false;
  const duplicatePhash = false;

  // AI score: combine EXIF + dimension signals + model judgment
  // If pipeline has model data, use it; otherwise use heuristics only.
  // Skip model-derived scoring when ocr_fallback is true — fallbackExtraction()
  // returns is_physical_receipt:false by default, which would push aiScore to 0.7
  // and trigger Grok on every Gemini outage despite having no real OCR data.
  let aiScore = 0.25; // default neutral
  if (pipeline?.extraction && !pipeline.extraction.ocr_fallback) {
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
  const heuristicRisk = pipeline?.fraudRisk ?? (authenticityScore > 0.6 ? 'low' : authenticityScore > 0.4 ? 'medium' : 'high') as 'low' | 'medium' | 'high' | 'critical';
  const flags = [...(exif.flags || []), ...(dims.flags || []), ...(pipeline?.flags || [])];

  // When Gemini was unavailable the extraction is heuristic-only — surface this
  // so Grok and Claude know the signals are degraded, not indicative of fraud.
  if (pipeline?.extraction?.ocr_fallback) flags.push('ocr_unavailable');

  // Run AI cross-validation for non-trivial cases.
  // P1-A: use >= FLAGS_THRESHOLD (was >) so 2 flags (e.g. no_exif + screen_dims)
  // trigger Grok — the canonical 2-signal screenshot pattern was being skipped.
  let crossValidation: CrossValidationResult | null = null;
  if (aiScore > AI_SCORE_THRESHOLD || tamperScore > TAMPER_SCORE_THRESHOLD || flags.length >= FLAGS_THRESHOLD) {
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
      raw_text: pipeline?.extraction?.raw_text, // C1: enables math consistency check
    }, context?.wallet); // P1-C: wallet as userId for Gateway attribution

    // AI cross-validation can elevate risk if it detects something heuristics missed
    if (crossValidation.fraudRiskLevel === 'high' && crossValidation.confidence > 0.7) {
      aiScore = Math.max(aiScore, 0.6);
      tamperScore = Math.max(tamperScore, 0.5);
    }
  }

  // Fire-and-forget: record high-severity signals to mem0 for cross-pipeline
  // intelligence. The Claude oversight worker will pick these up on the next
  // getEntityProfile() read for this wallet.
  recordFraudSignalsToMem0(context?.wallet, context?.claimId, {
    aiScore,
    tamperScore,
    isDigitallyManipulated: pipeline?.extraction?.is_digitally_manipulated,
    isPhysicalReceipt: pipeline?.extraction?.is_physical_receipt,
    flags,
    crossValidation,
  });

  // P2-C: never let Grok downgrade a heuristic 'high'/'critical' to 'low'/'medium'.
  // Take the higher-ranked label between heuristic and Grok verdict.
  const hRank = RISK_RANK[heuristicRisk] ?? 0;
  const gRank = crossValidation ? (RISK_RANK[crossValidation.fraudRiskLevel] ?? 0) : -1;
  const fraudRisk = (gRank >= hRank ? crossValidation!.fraudRiskLevel : heuristicRisk) as 'low' | 'medium' | 'high' | 'critical';

  return {
    aiScore,
    tamperScore,
    duplicateHash,
    duplicatePhash,
    hashSha256: exactHash,
    pHash,
    authenticityScore,
    fraudRisk,
    exifScore: exif.score,
    dimensionScore: dims.score,
    flags,
    crossValidation,
  };
}

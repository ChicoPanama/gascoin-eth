import { z } from 'zod';
import {
  computeExactHash,
  computePerceptualHash,
  checkExifMetadata,
  checkImageDimensions,
  type PipelineResult,
} from './receipt-pipeline';
import { getSystemPrompt, PROMPT_KEYS } from '../prompts';
import { generateAIJson, isAiGatewayAvailable, AI_MODELS } from './ai-gateway';
import { writeFraudSignal, addMemory, MEM0_CATEGORIES, MEM0_AGENTS, MEM0_APPS } from '../mem0';

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

const FraudResultSchema = z.object({
  fraudRiskLevel: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  concerns: z.array(z.string()),
});

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

Return the verdict JSON.`;
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
    enableAnthropicCache: true, // safe no-op on non-anthropic, future-proofs migration
    fallbackModels: [AI_MODELS.GEMINI_FAST, 'google/gemini-2.5-flash'],
    tags: ['feature:fraud-reasoning', 'pipeline:submit'],
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
  }
}

export async function runFraudChecks(raw: ArrayBuffer, pipeline?: PipelineResult, context?: { wallet?: string; claimId?: string }): Promise<FraudSignals> {
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

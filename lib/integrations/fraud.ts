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

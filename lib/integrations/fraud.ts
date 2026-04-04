import {
  computeExactHash,
  computePerceptualHash,
  checkExifMetadata,
  checkImageDimensions,
  type PipelineResult,
} from './receipt-pipeline';

export type FraudSignals = {
  aiScore: number;
  tamperScore: number;
  duplicateHash: boolean;
  duplicatePhash: boolean;
  hashSha256: string;
  pHash: string;
  // New pipeline signals
  authenticityScore: number;
  fraudRisk: string;
  exifScore: number;
  dimensionScore: number;
  flags: string[];
};

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
  };
}

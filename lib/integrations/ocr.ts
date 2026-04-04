import { processReceipt, type PipelineResult } from './receipt-pipeline';

export type OcrResult = {
  text: string;
  confidence: number;
  receiptHasGascoin: boolean;
  walletOnReceipt?: string;
  amountUsd?: number;
  pipeline?: PipelineResult;
  stationCity?: string;
  stationState?: string;
  stationCountry?: string;
};

export async function analyzeReceipt(file: File): Promise<OcrResult> {
  const buf = Buffer.from(await file.arrayBuffer());
  const pipeline = await processReceipt(buf, file.type || 'image/jpeg');
  const ext = pipeline.extraction;

  return {
    text: ext.raw_text,
    confidence: ext.confidence,
    receiptHasGascoin: ext.has_gascoin_hashtag,
    walletOnReceipt: ext.wallet_address || undefined,
    amountUsd: ext.total_amount || undefined,
    pipeline,
    stationCity: ext.station_city || undefined,
    stationState: ext.station_state || undefined,
    stationCountry: ext.station_country || undefined,
  };
}

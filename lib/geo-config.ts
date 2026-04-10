/**
 * Geoblocking configuration.
 * Countries in the blocklist are denied access at the edge middleware.
 * Uses ISO 3166-1 alpha-2 country codes (same as Vercel's x-vercel-ip-country header).
 */

// High bot-farm countries — adjust as needed based on submission data
export const BLOCKED_COUNTRIES: Set<string> = new Set([
  // Add country codes here when fraud patterns emerge
  // Example: 'NG', 'PH', 'BD', 'PK', 'VN'
]);

// Countries that trigger elevated scrutiny (not blocked, but higher risk weight)
export const ELEVATED_SCRUTINY_COUNTRIES: Set<string> = new Set([
  // These countries get +0.05 risk score adjustment
]);

export function isCountryBlocked(countryCode: string | null): boolean {
  if (!countryCode) return false;
  return BLOCKED_COUNTRIES.has(countryCode.toUpperCase());
}

export function isElevatedScrutiny(countryCode: string | null): boolean {
  if (!countryCode) return false;
  return ELEVATED_SCRUTINY_COUNTRIES.has(countryCode.toUpperCase());
}

/**
 * Score location consistency across multiple signals.
 * Returns a risk adjustment to add to the base risk score.
 */
export function scoreLocationConsistency(signals: {
  ipCountry: string | null;
  ocrCountry: string | null;
  ocrCurrency: string | null;
  exifHasGps: boolean;
}): { riskAdjustment: number; flags: string[] } {
  const flags: string[] = [];
  let adj = 0;

  // No IP country available (e.g. local dev) — skip
  if (!signals.ipCountry) return { riskAdjustment: 0, flags: [] };

  const ip = signals.ipCountry.toUpperCase();
  const ocr = signals.ocrCountry?.toUpperCase() ?? null;

  // IP country doesn't match receipt country AND no EXIF GPS to verify
  if (ocr && ip !== ocr && !signals.exifHasGps) {
    adj += 0.12;
    flags.push(`ip_ocr_mismatch:${ip}_vs_${ocr}`);
  }

  // IP matches receipt but no EXIF — slightly elevated but not alarming
  if (ocr && ip === ocr && !signals.exifHasGps) {
    adj += 0.02;
    flags.push('no_exif_gps');
  }

  // Currency doesn't match what we'd expect for the OCR country
  // (simplified — just flag if currency is set but country is too)
  if (signals.ocrCurrency && ocr) {
    const currencyCountryMap: Record<string, string[]> = {
      USD: ['US'], GBP: ['GB'], EUR: ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'GR'],
      CAD: ['CA'], AUD: ['AU'], MXN: ['MX'], BRL: ['BR'], JPY: ['JP'], INR: ['IN'],
    };
    const expected = currencyCountryMap[signals.ocrCurrency.toUpperCase()];
    if (expected && !expected.includes(ocr)) {
      adj += 0.08;
      flags.push(`currency_country_mismatch:${signals.ocrCurrency}_in_${ocr}`);
    }
  }

  // Elevated scrutiny country
  if (isElevatedScrutiny(ip)) {
    adj += 0.05;
    flags.push(`elevated_scrutiny:${ip}`);
  }

  return { riskAdjustment: Math.min(adj, 0.2), flags };
}

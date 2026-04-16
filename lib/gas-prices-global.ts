/**
 * Global gas prices — curated country averages for the /welcome pump
 * display ticker.
 *
 * The ticker is cosmetic, not a data product. Prices are refreshed
 * manually via PR. Units follow local convention:
 *   - USA uses gallons ($/gal)
 *   - Everyone else uses liters (X/L)
 *
 * Source basis: approximate averages compiled from GlobalPetrolPrices,
 * AAA, and national fuel price regulators as of early 2026. These are
 * intentionally rounded and may drift from live rates over time. Update
 * via PR when they get too stale.
 */

export type GasPriceSnapshot = {
  /** Display name, all-caps */
  country: string;
  /** 2-letter country code (ISO) */
  code: string;
  /** Price with currency symbol, no unit (unit is rendered separately) */
  price: string;
  /** Measurement unit shown as a suffix after the price */
  unit: '/gal' | '/L';
};

export const GLOBAL_GAS_PRICES: GasPriceSnapshot[] = [
  { country: 'USA',       code: 'US', price: '$3.42',  unit: '/gal' },
  { country: 'CANADA',    code: 'CA', price: 'C$1.58', unit: '/L'   },
  { country: 'UK',        code: 'UK', price: '£1.48',  unit: '/L'   },
  { country: 'GERMANY',   code: 'DE', price: '€1.72',  unit: '/L'   },
  { country: 'FRANCE',    code: 'FR', price: '€1.83',  unit: '/L'   },
  { country: 'ITALY',     code: 'IT', price: '€1.89',  unit: '/L'   },
  { country: 'SPAIN',     code: 'ES', price: '€1.62',  unit: '/L'   },
  { country: 'JAPAN',     code: 'JP', price: '¥175',   unit: '/L'   },
  { country: 'MEXICO',    code: 'MX', price: 'MX$24',  unit: '/L'   },
  { country: 'BRAZIL',    code: 'BR', price: 'R$6.15', unit: '/L'   },
  { country: 'INDIA',     code: 'IN', price: '₹96',    unit: '/L'   },
  { country: 'AUSTRALIA', code: 'AU', price: 'A$2.05', unit: '/L'   },
];

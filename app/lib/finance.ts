/**
 * finance.ts — autoX core financial calculation utilities
 *
 * All projections are illustrative only and are NOT guaranteed returns.
 */

// ── Scenarios (used by Calculator page) ──────────────────────────────────────

export interface Scenario {
  label: string;
  rate: number; // annual decimal, e.g. 0.08 for 8%
  color: string;
}

export const SCENARIOS: Scenario[] = [
  { label: "Conservative", rate: 0.08, color: "#6366f1" },
  { label: "Moderate",     rate: 0.12, color: "#22d3ee" },
  { label: "Aggressive",   rate: 0.15, color: "#34d399" },
];

// ── Dashboard return rates & horizons ────────────────────────────────────────

/** The four selectable annual return rates (as percentages, e.g. 6 = 6%). */
export const RETURN_RATES = [6, 8, 10, 12] as const;
export type ReturnRate = (typeof RETURN_RATES)[number];

/** The five selectable time horizons in years. */
export const PROJECTION_HORIZONS = [5, 10, 15, 20, 30] as const;
export type ProjectionHorizon = (typeof PROJECTION_HORIZONS)[number];

// ── Future Value — lump sum ───────────────────────────────────────────────────

/**
 * Calculates future value of a present lump-sum amount.
 * FV = PV × (1 + r)^n
 *
 * @param pv  Present value (₹)
 * @param r   Annual interest rate as a decimal (e.g. 0.12 for 12%)
 * @param n   Number of years
 */
export function futureValue(pv: number, r: number, n: number): number {
  if (pv <= 0 || r <= 0 || n <= 0) return pv;
  return pv * Math.pow(1 + r, n);
}

// ── Future Value — recurring monthly payments ─────────────────────────────────

/**
 * Calculates future value of equal monthly payments (ordinary annuity).
 * FV = PMT × [((1 + r/12)^(n×12) − 1) / (r/12)]
 *
 * @param pmt  Monthly payment amount (₹)
 * @param r    Annual interest rate as a decimal
 * @param n    Number of years
 */
export function futureValueRecurring(pmt: number, r: number, n: number): number {
  if (pmt <= 0 || r <= 0 || n <= 0) return 0;
  const rMonthly = r / 12;
  const months = n * 12;
  return pmt * ((Math.pow(1 + rMonthly, months) - 1) / rMonthly);
}

// ── Inflation-adjusted future value ──────────────────────────────────────────

/**
 * Converts a nominal future value to its real (inflation-adjusted) equivalent
 * expressed in today's rupees.
 *
 * realFV = nominalFV / (1 + inflationRate)^years
 *
 * @param nominalFV     The nominal (unadjusted) future value
 * @param inflationRate Annual inflation rate as a percentage (e.g. 6 for 6%)
 * @param years         Number of years
 */
export function inflationAdjusted(
  nominalFV: number,
  inflationRate: number,
  years: number
): number {
  if (years <= 0) return nominalFV;
  return nominalFV / Math.pow(1 + inflationRate / 100, years);
}

// ── Growth series (year-by-year) ──────────────────────────────────────────────

/**
 * Returns an array of future values at each year from year 1 to `maxYears`.
 * Useful for building line chart datasets.
 */
export function growthSeries(
  pv: number,
  r: number,
  maxYears: number = 20
): number[] {
  return Array.from({ length: maxYears }, (_, i) => futureValue(pv, r, i + 1));
}

// ── Indian Rupee formatter ────────────────────────────────────────────────────

/**
 * Formats a number as Indian rupees with the Indian numbering system
 * (lakhs, crores). E.g. 100000 → "₹1,00,000"
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}

/**
 * Compact formatter for large values (e.g. chart axes, tooltips).
 * ≥ 1 Cr → "₹X.XX Cr", ≥ 1 L → "₹X.XX L", else full INR format.
 */
export function formatINRCompact(amount: number): string {
  if (amount >= 1_00_00_000) {
    return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)} L`;
  }
  return formatINR(amount);
}

// ── Gain multiple ─────────────────────────────────────────────────────────────

/**
 * Returns how many times the investment grew (e.g. "3.1x").
 */
export function growthMultiple(pv: number, fv: number): string {
  if (pv <= 0) return "—";
  return `${(fv / pv).toFixed(1)}x`;
}

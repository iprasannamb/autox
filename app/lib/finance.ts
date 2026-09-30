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

// ── Comprehensive Future Value & Inflation Engine ─────────────────────────────

export interface FutureValueInput {
  monthlyInvestment: number;      // ₹ / month initial
  annualStepUpPercent: number;    // % annual step-up (e.g. 10 for 10%)
  startYear: number;              // e.g. 2026
  targetYear: number;             // e.g. 2036
  expectedReturnPercent: number;  // annual return % (e.g. 12 for 12%)
  inflationRatePercent: number;   // annual inflation % (e.g. 6 for 6%)
  targetRealCorpus?: number;      // optional custom real goal in today's ₹
}

export interface YearProjection {
  yearIndex: number;              // 1, 2, ... N
  calendarYear: number;           // e.g. 2026, 2027 ...
  monthlyInvestment: number;      // ₹/mo in that year
  annualContribution: number;     // ₹ contributed in that year
  totalInvested: number;          // cumulative ₹ contributed to date
  futureValue: number;            // nominal maturity value at end of year
  totalReturns: number;           // futureValue - totalInvested
  inflationFactor: number;        // (1 + inf)^yearIndex
  realValue: number;              // futureValue / inflationFactor
  inflationImpact: number;        // futureValue - realValue
  inflationBenchmarkValue: number;// cumulative contributions compounded at inflation rate
}

export interface SmartRecommendation {
  beatsInflation: boolean;
  statusText: string;
  explanation: string;
  recommendedMonthlyInvestment?: number;
  recommendedStepUpPercent?: number;
  recommendedReturnRate?: number;
  realWealthGain: number;         // realValue - totalInvested
  realGrowthMultiple: string;     // realValue / totalInvested
  nominalBeatsByAmount: number;   // maturity - inflationBenchmark
}

export interface FutureValuePlanResult {
  totalYears: number;
  targetYear: number;
  startYear: number;
  maturityAmount: number;          // Nominal final FV
  totalInvested: number;           // Total deposits
  totalEstimatedReturns: number;   // Maturity - Total Invested
  realValueAfterInflation: number; // Inflation-adjusted in today's ₹
  inflationImpact: number;         // Nominal - Real value
  inflationBenchmark: number;      // What money at inflation would become
  beatsInflation: boolean;
  amountAboveBelowInflation: number; // Real value - total invested (in today's ₹)
  nominalBeatsBy: number;          // Maturity - inflationBenchmark
  recommendation: SmartRecommendation;
  yearlyProjections: YearProjection[];
}

/**
 * Calculates complete month-by-month future value progression with annual step-up
 * and inflation adjustment.
 */
export function calculateFutureValuePlan(input: FutureValueInput): FutureValuePlanResult {
  const {
    monthlyInvestment,
    annualStepUpPercent,
    startYear,
    targetYear,
    expectedReturnPercent,
    inflationRatePercent,
    targetRealCorpus,
  } = input;

  const totalYears = Math.max(1, Math.min(50, targetYear - startYear));
  const rMonthly = (expectedReturnPercent / 100) / 12;
  const infMonthly = (inflationRatePercent / 100) / 12;

  let currentBalance = 0;
  let currentInflationBenchmark = 0;
  let totalDeposited = 0;

  const yearlyProjections: YearProjection[] = [];

  for (let y = 1; y <= totalYears; y++) {
    // Annual step-up applies to each subsequent year
    const monthlyForYear = monthlyInvestment * Math.pow(1 + annualStepUpPercent / 100, y - 1);
    const annualForYear = monthlyForYear * 12;

    for (let m = 1; m <= 12; m++) {
      totalDeposited += monthlyForYear;
      // Monthly compounding at start of month
      currentBalance = (currentBalance + monthlyForYear) * (1 + rMonthly);
      currentInflationBenchmark = (currentInflationBenchmark + monthlyForYear) * (1 + infMonthly);
    }

    const inflationFactor = Math.pow(1 + inflationRatePercent / 100, y);
    const realVal = currentBalance / inflationFactor;

    yearlyProjections.push({
      yearIndex: y,
      calendarYear: startYear + y,
      monthlyInvestment: Math.round(monthlyForYear),
      annualContribution: Math.round(annualForYear),
      totalInvested: Math.round(totalDeposited),
      futureValue: Math.round(currentBalance),
      totalReturns: Math.round(currentBalance - totalDeposited),
      inflationFactor,
      realValue: Math.round(realVal),
      inflationImpact: Math.round(currentBalance - realVal),
      inflationBenchmarkValue: Math.round(currentInflationBenchmark),
    });
  }

  const finalProj = yearlyProjections[yearlyProjections.length - 1];
  const maturityAmount = finalProj.futureValue;
  const totalInvested = finalProj.totalInvested;
  const totalEstimatedReturns = finalProj.totalReturns;
  const realValueAfterInflation = finalProj.realValue;
  const inflationImpact = finalProj.inflationImpact;
  const inflationBenchmark = finalProj.inflationBenchmarkValue;

  // Investment beats inflation if real return > 0 (or expectedReturn > inflationRate)
  const beatsInflation = expectedReturnPercent > inflationRatePercent;
  const amountAboveBelowInflation = realValueAfterInflation - totalInvested;
  const nominalBeatsBy = maturityAmount - inflationBenchmark;

  // Smart Recommendation Logic
  let recStatusText = "";
  let recExplanation = "";
  let recommendedMonthly: number | undefined;
  let recommendedStepUp: number | undefined;
  let recommendedReturn: number | undefined;

  if (!beatsInflation) {
    recStatusText = `Your investment is lagging behind inflation by ${(inflationRatePercent - expectedReturnPercent).toFixed(1)}% annually.`;
    recommendedReturn = Math.round(inflationRatePercent + 4); // Target inflation + 4% for healthy real returns
    
    // Calculate required monthly to break even in real terms if returns were at benchmark
    const factorPerRupee = maturityAmount / (monthlyInvestment || 1);
    const targetBreakeven = inflationBenchmark * 1.1; // 10% real buffer
    recommendedMonthly = Math.round(targetBreakeven / (factorPerRupee || 1));

    recExplanation = `At ${expectedReturnPercent}% annual return vs ${inflationRatePercent}% inflation, each rupee loses purchasing power over time. To genuinely beat inflation, allocate to growth assets (like NIFTY 50 or Flexi-cap equity mutual funds) targeting at least ${recommendedReturn}% p.a.`;
  } else {
    // If it beats inflation, verify if user has a target or how much real wealth is generated
    const realGain = realValueAfterInflation - totalInvested;
    const realMult = totalInvested > 0 ? (realValueAfterInflation / totalInvested).toFixed(2) : "1.00";
    
    recStatusText = `Your portfolio successfully outpaces inflation with a ${(expectedReturnPercent - inflationRatePercent).toFixed(1)}% real return spread.`;
    
    // If user provided a target real corpus (e.g. ₹50L or ₹1Cr) that is not met:
    if (targetRealCorpus && realValueAfterInflation < targetRealCorpus) {
      const scale = targetRealCorpus / realValueAfterInflation;
      recommendedMonthly = Math.round(monthlyInvestment * scale);
      recExplanation = `To achieve your real goal of ${formatINR(targetRealCorpus)} in today's purchasing power, you need to invest approximately ${formatINR(recommendedMonthly)}/month at your current ${annualStepUpPercent}% annual step-up.`;
    } else {
      recExplanation = `Your money compounds faster than price increases. In today's purchasing power, you will build ${formatINR(realGain)} in net real wealth (${realMult}x real purchasing multiplier) after neutralizing ${formatINR(inflationImpact)} in price inflation.`;
    }
  }

  const recommendation: SmartRecommendation = {
    beatsInflation,
    statusText: recStatusText,
    explanation: recExplanation,
    recommendedMonthlyInvestment: recommendedMonthly,
    recommendedStepUpPercent: recommendedStepUp,
    recommendedReturnRate: recommendedReturn,
    realWealthGain: realValueAfterInflation - totalInvested,
    realGrowthMultiple: totalInvested > 0 ? (realValueAfterInflation / totalInvested).toFixed(2) + "x" : "1.0x",
    nominalBeatsByAmount: nominalBeatsBy,
  };

  return {
    totalYears,
    targetYear,
    startYear,
    maturityAmount,
    totalInvested,
    totalEstimatedReturns,
    realValueAfterInflation,
    inflationImpact,
    inflationBenchmark,
    beatsInflation,
    amountAboveBelowInflation,
    nominalBeatsBy,
    recommendation,
    yearlyProjections,
  };
}

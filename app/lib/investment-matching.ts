/**
 * investment-matching.ts — Goal-Based Investment Matching Engine
 *
 * Evaluates investment products against the user's active financial goal.
 * Explains WHY an option fits or diverges rather than merely ranking by return.
 *
 * Strict Compliance:
 * - Uses exact phrasing: "Database-listed indicative return range: X–Y%"
 * - Never claims an investment will definitely achieve the goal.
 * - Never guarantees returns.
 */

import {
  type InvestmentProduct,
  type UserFinancialGoal,
  formatIndicativeReturn,
} from "./investments";
import { formatINR, calculateFutureValuePlan } from "./finance";

// ── Match Result Interface ───────────────────────────────────────────────────

export interface GoalMatchResult {
  score: number; // 0 - 100
  matchQuality: "High Match" | "Moderate Match" | "Diversifier" | "Selective Fit";
  headline: string; // e.g. "6-year horizon · Moderate risk · ₹500 minimum investment"
  reasons: string[];
  caveats: string[];
  fundingGap: {
    hasGap: boolean;
    gapAmount: number;
    projectedCorpus: number;
    targetCorpus: number;
    suggestedMonthly: number;
    explanation: string;
  };
  metrics: {
    estimatedReturnMidpoint: number;
    horizonMinYears: number;
    horizonMaxYears: number;
    goalTenureYears: number;
    isAffordable: boolean;
    beatsInflationSpread: number;
  };
}

// ── Core Goal-Based Match Function ───────────────────────────────────────────

export function matchInvestmentToGoal(
  investment: InvestmentProduct,
  goal: UserFinancialGoal
): GoalMatchResult {
  const goalTenure = Math.max(1, goal.targetMaturityYear - goal.startYear);
  const retMin = investment.expected_return_min;
  const retMax = investment.expected_return_max;
  const retAvg = (retMin + retMax) / 2;
  const hMin = investment.horizon_min_years;
  const hMax = investment.horizon_max_years;

  let score = 50;
  const reasons: string[] = [];
  const caveats: string[] = [];

  // 1. Horizon Alignment
  // Target tenure fits if it falls within [hMin, hMax] or is >= hMin
  if (goalTenure >= hMin && goalTenure <= hMax + 3) {
    score += 20;
    reasons.push(
      `Horizon Alignment: Your ${goalTenure}-year goal timeline to ${goal.targetMaturityYear} aligns with the recommended ${investment.horizon} investment horizon.`
    );
  } else if (goalTenure < hMin) {
    score -= 12;
    caveats.push(
      `Horizon Caution: Recommended horizon is ${investment.horizon}. Your ${goalTenure}-year timeline is shorter, which may expose capital to market cycles before maturity.`
    );
  } else {
    score += 10;
    reasons.push(
      `Extended Horizon: Your ${goalTenure}-year horizon comfortably exceeds the minimum ${hMin}-year holding requirement.`
    );
  }

  // 2. Minimum Investment Affordability
  const isAffordable = goal.monthlyInvestment >= investment.minimum_investment;
  if (isAffordable) {
    score += 15;
    reasons.push(
      `Deposit Accessibility: Minimum requirement of ${formatINR(investment.minimum_investment)} is fully covered by your planned monthly commitment of ${formatINR(goal.monthlyInvestment)}.`
    );
  } else {
    score -= 10;
    caveats.push(
      `Initial Capital Gap: Requires a minimum initial investment of ${formatINR(investment.minimum_investment)} (vs your current ${formatINR(goal.monthlyInvestment)}/month). May require initial lump-sum accumulation.`
    );
  }

  // 3. Inflation Protection Spread
  const spread = retAvg - goal.inflationPercent;
  if (spread >= 3) {
    score += 15;
    reasons.push(
      `Inflation Protection Spread: ${formatIndicativeReturn(retMin, retMax)} provides an indicative +${spread.toFixed(1)}% real spread above your ${goal.inflationPercent}% inflation benchmark.`
    );
  } else if (spread > 0) {
    score += 8;
    reasons.push(
      `Real Spread: ${formatIndicativeReturn(retMin, retMax)} outpaces your ${goal.inflationPercent}% inflation benchmark by an indicative +${spread.toFixed(1)}%.`
    );
  } else {
    score -= 15;
    caveats.push(
      `Purchasing Power Risk: ${formatIndicativeReturn(retMin, retMax)} may not fully outpace your ${goal.inflationPercent}% inflation benchmark.`
    );
  }

  // 4. Target Amount Scale & Growth Capability
  if (retAvg >= goal.expectedGrowthPercent) {
    score += 10;
    reasons.push(
      `Growth Alignment: Indicative return range (${retMin}% – ${retMax}%) is compatible with your target growth rate of ${goal.expectedGrowthPercent}% p.a. toward ${formatINR(goal.targetMaturityAmount)}.`
    );
  } else {
    const lag = (goal.expectedGrowthPercent - retAvg).toFixed(1);
    score -= 8;
    caveats.push(
      `Growth Differential: Indicative midpoint return (${retAvg}%) is ~${lag}% lower than your calculator expected growth rate (${goal.expectedGrowthPercent}%).`
    );
  }

  // 5. Risk & Regulatory Status Alignment
  const productRisk = (investment.risk_level || "Moderate").toLowerCase();
  const goalRisk = (goal.riskPreference || "Moderate").toLowerCase();

  if (productRisk.includes(goalRisk) || (goalRisk === "moderate" && (productRisk.includes("low") || productRisk.includes("moderate")))) {
    score += 10;
    reasons.push(
      `Risk Profile: ${investment.risk_level} risk level is suitable for your ${goal.riskPreference || "Moderate"} preference and ${goal.goalType || "wealth creation"} objective.`
    );
  } else {
    caveats.push(
      `Risk Notice: Classified as ${investment.risk_level} risk — verify whether this risk level fits your comfort tolerance.`
    );
  }

  // Institutional Compliance
  if (investment.regulatory_status) {
    reasons.push(
      `Institutional Framework: Regulated under ${investment.regulatory_status} by ${investment.provider}.`
    );
  }

  // 6. Funding Gap Simulation (Reusing calculateFutureValuePlan)
  // Run simulation using the conservative (lower-bound) indicative return
  const simPlan = calculateFutureValuePlan({
    monthlyInvestment: goal.monthlyInvestment,
    annualStepUpPercent: goal.annualStepUpPercent,
    startYear: goal.startYear,
    targetYear: goal.targetMaturityYear,
    expectedReturnPercent: retMin,
    inflationRatePercent: goal.inflationPercent,
  });

  const projectedCorpus = simPlan.maturityAmount;
  const targetCorpus = goal.targetMaturityAmount;
  const gapAmount = Math.max(0, targetCorpus - projectedCorpus);
  const hasGap = gapAmount > 0 && targetCorpus > 0;

  let suggestedMonthly = goal.monthlyInvestment;
  let gapExplanation = "";

  if (hasGap) {
    const scale = targetCorpus / Math.max(1, projectedCorpus);
    suggestedMonthly = Math.round(goal.monthlyInvestment * scale);
    gapExplanation = `At the lower indicative rate of ${retMin}%, projected mathematical corpus reaches ~${formatINR(projectedCorpus)}, indicating a potential contribution gap of ${formatINR(gapAmount)}. Stepping up monthly investment to ~${formatINR(suggestedMonthly)} closes this potential gap.`;
  } else {
    gapExplanation = `Mathematical compounding at ${retMin}% indicative rate projects a maturity corpus of ~${formatINR(projectedCorpus)}, meeting your ${formatINR(targetCorpus)} milestone.`;
  }

  // Formulate the headline matching the user's explicit example:
  // e.g. "6-year horizon · Moderate risk · ₹500 minimum investment"
  const headline = `${investment.horizon} horizon · ${investment.risk_level} risk · ${formatINR(investment.minimum_investment)} minimum investment`;

  // Clamp score
  const finalScore = Math.min(99, Math.max(35, Math.round(score)));

  let matchQuality: GoalMatchResult["matchQuality"] = "Selective Fit";
  if (finalScore >= 85) matchQuality = "High Match";
  else if (finalScore >= 72) matchQuality = "Moderate Match";
  else if (finalScore >= 55) matchQuality = "Diversifier";

  return {
    score: finalScore,
    matchQuality,
    headline,
    reasons,
    caveats,
    fundingGap: {
      hasGap,
      gapAmount,
      projectedCorpus,
      targetCorpus,
      suggestedMonthly,
      explanation: gapExplanation,
    },
    metrics: {
      estimatedReturnMidpoint: retAvg,
      horizonMinYears: hMin,
      horizonMaxYears: hMax,
      goalTenureYears: goalTenure,
      isAffordable,
      beatsInflationSpread: spread,
    },
  };
}

// ── Filter and Ranking Utilities ─────────────────────────────────────────────

export interface InvestmentFilters {
  category: string;       // All or specific type
  risk: string;           // All, Low, Moderate, High, Very High
  horizon: string;        // All, < 3 Years, 3-5 Years, 5+ Years, 7+ Years
  minInvestment: string;  // All, <= 500, <= 1000, <= 5000, <= 10000
  goalType: string;       // All or specific
  searchQuery: string;    // text search
  sortBy: "match" | "return" | "min_invest" | "risk";
}

export const DEFAULT_FILTERS: InvestmentFilters = {
  category: "All",
  risk: "All",
  horizon: "All",
  minInvestment: "All",
  goalType: "All",
  searchQuery: "",
  sortBy: "match",
};

export function filterAndRankInvestments(
  products: InvestmentProduct[],
  goal: UserFinancialGoal,
  filters: InvestmentFilters
): { investment: InvestmentProduct; match: GoalMatchResult }[] {
  const scored = products.map((inv) => ({
    investment: inv,
    match: matchInvestmentToGoal(inv, goal),
  }));

  const filtered = scored.filter(({ investment, match }) => {
    // 1. Search Query (name, provider, type, regulatory_status, isin, ticker_symbol, exchange)
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchText = `${investment.name} ${investment.provider} ${investment.type} ${investment.regulatory_status} ${investment.isin || ""} ${investment.ticker_symbol || ""} ${investment.exchange || ""} ${investment.description || ""}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    // 2. Category / Type
    if (filters.category !== "All") {
      const cat = filters.category.toLowerCase();
      const invType = investment.type.toLowerCase();
      if (!invType.includes(cat) && !cat.includes(invType)) return false;
    }

    // 3. Risk Level
    if (filters.risk !== "All") {
      if (!investment.risk_level.toLowerCase().includes(filters.risk.toLowerCase())) return false;
    }

    // 4. Horizon
    if (filters.horizon !== "All") {
      const hMin = match.metrics.horizonMinYears;
      if (filters.horizon === "< 3 Years" && hMin >= 3) return false;
      if (filters.horizon === "3-5 Years" && (hMin < 3 || hMin > 5)) return false;
      if (filters.horizon === "5+ Years" && hMin < 5) return false;
      if (filters.horizon === "7+ Years" && hMin < 7) return false;
    }

    // 5. Minimum Investment
    if (filters.minInvestment !== "All") {
      const cap = parseInt(filters.minInvestment.replace(/[^\d]/g, ""), 10);
      if (cap && investment.minimum_investment > cap) return false;
    }

    // 6. Goal Type
    if (filters.goalType !== "All") {
      const g = String(investment.goal_types || "").toLowerCase();
      if (!g.includes(filters.goalType.toLowerCase())) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (filters.sortBy === "match") {
      return b.match.score - a.match.score;
    }
    if (filters.sortBy === "return") {
      return b.investment.expected_return_max - a.investment.expected_return_max;
    }
    if (filters.sortBy === "min_invest") {
      return a.investment.minimum_investment - b.investment.minimum_investment;
    }
    if (filters.sortBy === "risk") {
      const rank: Record<string, number> = { low: 1, moderate: 2, high: 3, "very high": 4 };
      const rA = rank[a.investment.risk_level.toLowerCase()] || 2;
      const rB = rank[b.investment.risk_level.toLowerCase()] || 2;
      return rA - rB;
    }
    return 0;
  });

  return filtered;
}

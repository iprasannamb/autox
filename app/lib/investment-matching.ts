/**
 * investment-matching.ts — Goal-Based Investment Matching Engine
 *
 * Evaluates investment products against the user's active financial goal.
 * Explains WHY an option fits or diverges rather than merely ranking by return.
 *
 * All returns and projections are illustrative mathematical calculations
 * and NEVER presented as guaranteed returns.
 */

import {
  type InvestmentProduct,
  type UserFinancialGoal,
} from "./investments";
import { formatINR, calculateFutureValuePlan } from "./finance";

// ── Match Result Interface ───────────────────────────────────────────────────

export interface GoalMatchResult {
  score: number; // 0 - 100
  matchQuality: "High Match" | "Moderate Match" | "Diversifier" | "Selective Fit";
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
    horizonYears: number;
    goalTenureYears: number;
    isAffordable: boolean;
    beatsInflationSpread: number;
  };
}

// ── Helpers to parse returns and horizons ────────────────────────────────────

export function parseReturnRange(rangeStr: string): { min: number; max: number; avg: number } {
  // Matches numbers like "12% - 15%" or "7.1% p.a." or "8.5"
  const matches = rangeStr.match(/(\d+(?:\.\d+)?)/g);
  if (!matches || matches.length === 0) {
    return { min: 8, max: 12, avg: 10 };
  }
  const nums = matches.map(Number);
  if (nums.length === 1) {
    return { min: nums[0], max: nums[0], avg: nums[0] };
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max, avg: (min + max) / 2 };
}

export function parseHorizonYears(horizonStr: string): number {
  const matches = horizonStr.match(/(\d+)/g);
  if (!matches || matches.length === 0) return 3;
  return Math.min(...matches.map(Number));
}

// ── Core Goal-Based Match Function ───────────────────────────────────────────

export function matchInvestmentToGoal(
  investment: InvestmentProduct,
  goal: UserFinancialGoal
): GoalMatchResult {
  const goalTenure = Math.max(1, goal.targetMaturityYear - goal.startYear);
  const { min: retMin, max: retMax, avg: retAvg } = parseReturnRange(investment.indicative_return_range);
  const minHorizon = parseHorizonYears(investment.horizon);

  let score = 50; // base baseline
  const reasons: string[] = [];
  const caveats: string[] = [];

  // 1. Horizon Alignment
  const horizonDelta = goalTenure - minHorizon;
  if (horizonDelta >= 0) {
    score += 18;
    reasons.push(
      `Horizon Synergy: Recommended holding period (${investment.horizon}) comfortably fits your ${goalTenure}-year roadmap to ${goal.targetMaturityYear}.`
    );
  } else {
    score -= 12;
    caveats.push(
      `Timeframe Sensitivity: Product suggests a ${investment.horizon} horizon, which exceeds your planned ${goalTenure}-year target window.`
    );
  }

  // 2. Minimum Investment Affordability
  const isAffordable = goal.monthlyInvestment >= investment.minimum_investment;
  if (isAffordable) {
    score += 14;
    reasons.push(
      `Accessible Entry: Minimum deposit of ${formatINR(investment.minimum_investment)} is fully covered by your monthly commitment of ${formatINR(goal.monthlyInvestment)}.`
    );
  } else {
    score -= 10;
    caveats.push(
      `Capital Requirement: Requires minimum initial outlay of ${formatINR(investment.minimum_investment)} (your planned monthly SIP is ${formatINR(goal.monthlyInvestment)}). Lump-sum accumulation needed.`
    );
  }

  // 3. Inflation Protection Spread
  const spread = retAvg - goal.inflationPercent;
  if (spread >= 3) {
    score += 15;
    reasons.push(
      `Robust Inflation Hedge: Indicative yield (${investment.indicative_return_range}) offers a +${spread.toFixed(1)}% real spread above your ${goal.inflationPercent}% inflation estimate.`
    );
  } else if (spread > 0) {
    score += 8;
    reasons.push(
      `Inflation Positive: Indicative returns slightly outpace your ${goal.inflationPercent}% inflation benchmark (+${spread.toFixed(1)}% real spread).`
    );
  } else {
    score -= 15;
    caveats.push(
      `Purchasing Power Risk: Indicative return (${investment.indicative_return_range}) may fail to keep pace with your ${goal.inflationPercent}% inflation assumption.`
    );
  }

  // 4. Target Amount Scale & Growth Capability
  if (retAvg >= goal.expectedGrowthPercent) {
    score += 12;
    reasons.push(
      `Growth Compatibility: Estimated return range aligns with your target growth rate of ${goal.expectedGrowthPercent}% p.a. toward ${formatINR(goal.targetMaturityAmount)}.`
    );
  } else {
    const lag = (goal.expectedGrowthPercent - retAvg).toFixed(1);
    score -= 8;
    caveats.push(
      `Lower Expected Growth: Indicative return (${investment.indicative_return_range}) is ~${lag}% lower than your target calculation rate (${goal.expectedGrowthPercent}%).`
    );
  }

  // 5. Risk & Regulatory Status Alignment
  const productRisk = (investment.risk || "Moderate").toLowerCase();
  const goalRisk = (goal.riskPreference || "Moderate").toLowerCase();

  if (productRisk.includes(goalRisk) || (goalRisk === "moderate" && (productRisk.includes("low") || productRisk.includes("moderate")))) {
    score += 10;
    reasons.push(
      `Risk Harmony: ${investment.risk} risk profile aligns with your ${goal.riskPreference || "Moderate"} preference for ${goal.goalType || "wealth creation"}.`
    );
  } else {
    caveats.push(
      `Risk Profile: Classified as ${investment.risk} risk — verify that this fits your comfort level.`
    );
  }

  // Institutional Compliance
  if (investment.regulatory_status) {
    reasons.push(
      `Institutional Oversight: Complies under ${investment.regulatory_status} via ${investment.provider}.`
    );
  }

  // 6. Funding Gap Simulation (Reusing calculateFutureValuePlan)
  // Run simulation using the conservative/lower-bound indicative return
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
    gapExplanation = `At the lower indicative rate of ${retMin}%, projected corpus reaches ~${formatINR(projectedCorpus)}, indicating a potential gap of ${formatINR(gapAmount)}. Stepping up monthly savings to ~${formatINR(suggestedMonthly)} closes this gap.`;
  } else {
    gapExplanation = `Compounding at ${retMin}% indicative rate is projected to yield ~${formatINR(projectedCorpus)}, fully meeting your ${formatINR(targetCorpus)} milestone.`;
  }

  // Clamp score
  const finalScore = Math.min(99, Math.max(35, Math.round(score)));

  let matchQuality: GoalMatchResult["matchQuality"] = "Selective Fit";
  if (finalScore >= 85) matchQuality = "High Match";
  else if (finalScore >= 72) matchQuality = "Moderate Match";
  else if (finalScore >= 55) matchQuality = "Diversifier";

  return {
    score: finalScore,
    matchQuality,
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
      horizonYears: minHorizon,
      goalTenureYears: goalTenure,
      isAffordable,
      beatsInflationSpread: spread,
    },
  };
}

// ── Filter and Ranking Utilities ─────────────────────────────────────────────

export interface InvestmentFilters {
  category: string;     // All or specific type
  risk: string;         // All, Low, Moderate, High, Very High
  horizon: string;      // All, < 3 Years, 3-5 Years, 5+ Years
  minInvestment: string;// All, <= 1000, <= 5000, <= 10000
  goalType: string;     // All or specific
  searchQuery: string;  // text match
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
    // 1. Search Query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchText = `${investment.name} ${investment.provider} ${investment.type} ${investment.regulatory_status} ${investment.goal_type || ""}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    // 2. Category / Type
    if (filters.category !== "All") {
      const cat = filters.category.toLowerCase();
      const invType = investment.type.toLowerCase();
      if (!invType.includes(cat) && !cat.includes(invType)) return false;
    }

    // 3. Risk
    if (filters.risk !== "All") {
      if (!investment.risk.toLowerCase().includes(filters.risk.toLowerCase())) return false;
    }

    // 4. Horizon
    if (filters.horizon !== "All") {
      const hYears = match.metrics.horizonYears;
      if (filters.horizon === "< 3 Years" && hYears >= 3) return false;
      if (filters.horizon === "3-5 Years" && (hYears < 3 || hYears > 5)) return false;
      if (filters.horizon === "5+ Years" && hYears < 5) return false;
      if (filters.horizon === "7+ Years" && hYears < 7) return false;
    }

    // 5. Minimum Investment
    if (filters.minInvestment !== "All") {
      const cap = parseInt(filters.minInvestment.replace(/[^\d]/g, ""), 10);
      if (cap && investment.minimum_investment > cap) return false;
    }

    // 6. Goal Type
    if (filters.goalType !== "All") {
      const g = (investment.goal_type || "").toLowerCase();
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
      return b.match.metrics.estimatedReturnMidpoint - a.match.metrics.estimatedReturnMidpoint;
    }
    if (filters.sortBy === "min_invest") {
      return a.investment.minimum_investment - b.investment.minimum_investment;
    }
    if (filters.sortBy === "risk") {
      const rank: Record<string, number> = { low: 1, moderate: 2, high: 3, "very high": 4 };
      const rA = rank[a.investment.risk.toLowerCase()] || 2;
      const rB = rank[b.investment.risk.toLowerCase()] || 2;
      return rA - rB;
    }
    return 0;
  });

  return filtered;
}

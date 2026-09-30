/**
 * investments.ts — Investment Product types, Supabase fetcher, and Goal state management.
 *
 * NOTE: Per project rules, we NEVER create, modify, seed, or populate Supabase tables.
 * Data is fetched dynamically from the user's existing Supabase database.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatINR, calculateFutureValuePlan, type FutureValuePlanResult, type FutureValueInput } from "./finance";

// ── Supported Categories ───────────────────────────────────────────────────────

export const INVESTMENT_CATEGORIES = [
  "Stocks — SEBI registered",
  "SIP / Mutual Funds",
  "Government Bonds",
  "Corporate Bonds",
  "Gold",
  "Crypto — FIU-IND registered platforms",
] as const;

export type InvestmentCategory = (typeof INVESTMENT_CATEGORIES)[number];

// ── Investment Product Interface ──────────────────────────────────────────────

export interface InvestmentProduct {
  id: string;
  name: string;
  type: string;
  provider: string;
  risk: "Low" | "Moderate" | "High" | "Very High" | string;
  indicative_return_range: string;
  minimum_investment: number;
  horizon: string;
  liquidity: string;
  regulatory_status: string;
  source: string;
  last_updated: string;
  goal_type?: string;
  description?: string;
  raw?: Record<string, unknown>;
}

// ── User Financial Goal (created by Calculator) ───────────────────────────────

export interface UserFinancialGoal {
  id: string;
  title: string;
  monthlyInvestment: number;      // ₹ / month initial
  annualStepUpPercent: number;    // % annual step-up
  startYear: number;              // e.g. 2026
  targetMaturityYear: number;     // e.g. 2036
  expectedGrowthPercent: number;  // annual return %
  inflationPercent: number;       // annual inflation %
  targetMaturityAmount: number;   // Nominal final maturity corpus
  inflationAdjustedTarget: number;// Real value in today's purchasing power
  requiredMonthlyInvestment?: number; // Needed to meet target corpus
  beatsInflation: boolean;        // Whether growth > inflation
  goalType?: string;              // e.g. "Wealth Creation", "Retirement", etc.
  riskPreference?: "Conservative" | "Moderate" | "Aggressive";
  nominalBeatsByAmount?: number;
  realWealthGain?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Default Goal Generator ────────────────────────────────────────────────────

export function getDefaultGoal(): UserFinancialGoal {
  const currentYear = new Date().getFullYear();
  const input: FutureValueInput = {
    monthlyInvestment: 10000,
    annualStepUpPercent: 10,
    startYear: currentYear,
    targetYear: currentYear + 10,
    expectedReturnPercent: 12,
    inflationRatePercent: 6,
    targetRealCorpus: 5000000,
  };
  const plan = calculateFutureValuePlan(input);

  return {
    id: "goal-default",
    title: "10-Year Wealth Creation Goal",
    monthlyInvestment: input.monthlyInvestment,
    annualStepUpPercent: input.annualStepUpPercent,
    startYear: input.startYear,
    targetMaturityYear: input.targetYear,
    expectedGrowthPercent: input.expectedReturnPercent,
    inflationPercent: input.inflationRatePercent,
    targetMaturityAmount: plan.maturityAmount,
    inflationAdjustedTarget: plan.realValueAfterInflation,
    requiredMonthlyInvestment: plan.recommendation.recommendedMonthlyInvestment,
    beatsInflation: plan.beatsInflation,
    goalType: "Wealth Creation",
    riskPreference: "Moderate",
    nominalBeatsByAmount: plan.nominalBeatsBy,
    realWealthGain: plan.recommendation.realWealthGain,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Goal Storage & Sync ───────────────────────────────────────────────────────

export const GOAL_STORAGE_KEY = "autox_active_financial_goal";
export const GOAL_SYNC_EVENT = "autox_financial_goal_sync";

export function getStoredGoal(): UserFinancialGoal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GOAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.monthlyInvestment === "number") {
        return parsed as UserFinancialGoal;
      }
    }
  } catch {
    // ignore json error
  }
  return null;
}

export function persistGoal(goal: UserFinancialGoal): void {
  if (typeof window === "undefined") return;
  try {
    const payload = { ...goal, updatedAt: new Date().toISOString() };
    localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(GOAL_SYNC_EVENT, { detail: payload }));
  } catch (err) {
    console.error("Failed to persist financial goal:", err);
  }
}

/**
 * Creates a normalized UserFinancialGoal from Calculator inputs and plan results.
 */
export function buildGoalFromCalculator(
  input: FutureValueInput,
  plan: FutureValuePlanResult,
  goalType = "Wealth Creation"
): UserFinancialGoal {
  let risk: "Conservative" | "Moderate" | "Aggressive" = "Moderate";
  if (input.expectedReturnPercent <= 8) risk = "Conservative";
  else if (input.expectedReturnPercent >= 14) risk = "Aggressive";

  const tenure = Math.max(1, input.targetYear - input.startYear);
  const title = `${tenure}-Year ${goalType} Goal`;

  return {
    id: `goal-${Date.now()}`,
    title,
    monthlyInvestment: input.monthlyInvestment,
    annualStepUpPercent: input.annualStepUpPercent,
    startYear: input.startYear,
    targetMaturityYear: input.targetYear,
    expectedGrowthPercent: input.expectedReturnPercent,
    inflationPercent: input.inflationRatePercent,
    targetMaturityAmount: plan.maturityAmount,
    inflationAdjustedTarget: plan.realValueAfterInflation,
    requiredMonthlyInvestment: plan.recommendation.recommendedMonthlyInvestment,
    beatsInflation: plan.beatsInflation,
    goalType,
    riskPreference: risk,
    nominalBeatsByAmount: plan.nominalBeatsBy,
    realWealthGain: plan.recommendation.realWealthGain,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Hook to reactively consume and update the active financial goal.
 */
export function useActiveGoal() {
  const [goal, setGoal] = useState<UserFinancialGoal>(() => {
    return getStoredGoal() || getDefaultGoal();
  });

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<UserFinancialGoal>;
      if (custom.detail) {
        setGoal(custom.detail);
      }
    };

    window.addEventListener(GOAL_SYNC_EVENT, handleSync);
    
    // Also read on mount in case it changed in another tab
    const existing = getStoredGoal();
    if (existing) {
      setGoal(existing);
    }

    return () => {
      window.removeEventListener(GOAL_SYNC_EVENT, handleSync);
    };
  }, []);

  const updateGoal = useCallback((newGoal: UserFinancialGoal) => {
    persistGoal(newGoal);
    setGoal(newGoal);
  }, []);

  return { goal, updateGoal };
}

// ── Supabase Dynamic Investment Fetcher & Normalizer ──────────────────────────

/**
 * Normalizes any Supabase record into a typed InvestmentProduct.
 * Supports flexible column naming conventions (camelCase, snake_case, aliases).
 */
export function normalizeInvestment(raw: Record<string, unknown>, index: number): InvestmentProduct {
  const id = String(raw.id ?? raw._id ?? `inv-${index + 1}`);
  const name = String(raw.name ?? raw.title ?? raw.product_name ?? raw.investment_name ?? `Investment Option #${index + 1}`);
  const type = String(raw.type ?? raw.category ?? raw.investment_type ?? raw.asset_class ?? "SIP / Mutual Funds");
  const provider = String(raw.provider ?? raw.issuer ?? raw.amc ?? raw.institution ?? raw.platform ?? "SEBI Regulated Provider");
  const risk = String(raw.risk ?? raw.risk_level ?? raw.risk_rating ?? "Moderate");

  const indicative_return_range = String(
    raw.indicative_return_range ??
    raw.indicative_returns ??
    raw.return_range ??
    raw.returns ??
    raw.expected_return ??
    raw.annual_return ??
    "10% - 12%"
  );

  const minVal = raw.minimum_investment ?? raw.min_investment ?? raw.min_amount ?? raw.minimum_amount ?? 500;
  const minimum_investment = typeof minVal === "number" ? minVal : (parseInt(String(minVal).replace(/[^\d]/g, ""), 10) || 500);

  const horizon = String(raw.horizon ?? raw.investment_horizon ?? raw.recommended_horizon ?? raw.tenure ?? raw.time_horizon ?? "3-5 Years");
  const liquidity = String(raw.liquidity ?? raw.liquidity_type ?? raw.lock_in ?? raw.lock_in_period ?? "High (T+1)");
  const regulatory_status = String(raw.regulatory_status ?? raw.regulation ?? raw.regulator ?? raw.compliance ?? "SEBI Registered");
  const source = String(raw.source ?? raw.data_source ?? raw.reference ?? "Supabase Registry");
  const last_updated = String(raw.last_updated ?? raw.updated_at ?? raw.created_at ?? new Date().toISOString().split("T")[0]);
  const goal_type = String(raw.goal_type ?? raw.suitable_for ?? raw.goal ?? raw.category_goal ?? "Wealth Creation");
  const description = raw.description || raw.details || raw.notes ? String(raw.description || raw.details || raw.notes) : undefined;

  return {
    id,
    name,
    type,
    provider,
    risk,
    indicative_return_range,
    minimum_investment,
    horizon,
    liquidity,
    regulatory_status,
    source,
    last_updated,
    goal_type,
    description,
    raw,
  };
}

/**
 * Dynamically fetches investment records from the user's existing Supabase table.
 * Does NOT modify, create, or seed any table.
 */
export async function fetchInvestmentsFromSupabase(): Promise<{
  data: InvestmentProduct[];
  error: string | null;
  tableName: string;
}> {
  const supabase = createClient();
  const preferredTable = process.env.NEXT_PUBLIC_INVESTMENTS_TABLE || "investments";
  const candidateTables = [preferredTable, "investment_products", "products", "investment"];

  let lastError: string | null = null;
  let resolvedTable = preferredTable;

  for (const table of candidateTables) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && Array.isArray(data)) {
        resolvedTable = table;
        const normalized = data.map((item, idx) => normalizeInvestment(item as Record<string, unknown>, idx));
        return { data: normalized, error: null, tableName: resolvedTable };
      }
      if (error) {
        lastError = error.message;
      }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    data: [],
    error: lastError,
    tableName: preferredTable,
  };
}

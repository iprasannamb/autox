/**
 * investments.ts — Investment Product types, Supabase fetcher, and Goal state management.
 *
 * NOTE: Per project rules, we NEVER create, modify, seed, or populate Supabase tables.
 * Data is fetched dynamically from the user's existing Supabase table: `investment_products`.
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

// ── Investment Product Interface matching Supabase `investment_products` ───────

export interface InvestmentProduct {
  id: string;
  name: string;
  type: string;
  provider: string;
  description?: string | null;
  risk_level: string;
  expected_return_min: number;
  expected_return_max: number;
  minimum_investment: number;
  horizon_min_years: number;
  horizon_max_years: number;
  lock_in_years?: number | null;
  liquidity: string;
  goal_types?: string[] | string | null;
  regulatory_status: string;
  source_name: string;
  source_url?: string | null;
  last_updated: string;
  isin?: string | null;
  ticker_symbol?: string | null;
  exchange?: string | null;
  currency?: string | null;
  data_as_of?: string | null;
  product_status?: string | null;
  is_active?: boolean | null;

  // Convenience computed fields for UI rendering
  indicative_return_range: string;
  horizon: string;
  risk: string;
  source: string;
  raw?: Record<string, unknown>;
}

// ── Data Freshness Helpers ────────────────────────────────────────────────────

export interface FreshnessInfo {
  isStale: boolean;
  daysAgo: number;
  monthsAgo: number;
  label: string;
}

export function checkDataFreshness(dateStr?: string | null): FreshnessInfo {
  if (!dateStr) {
    return { isStale: false, daysAgo: 0, monthsAgo: 0, label: "Date unavailable" };
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { isStale: false, daysAgo: 0, monthsAgo: 0, label: dateStr };
  }
  const diffMs = Date.now() - date.getTime();
  const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const monthsAgo = Math.floor(daysAgo / 30);
  const isStale = daysAgo > 90; // Over 3 months is flagged as stale

  let label = `${daysAgo}d ago`;
  if (monthsAgo >= 1) {
    label = `${monthsAgo} mo ago`;
  }

  return { isStale, daysAgo, monthsAgo, label };
}

// ── Formatting Safe Return & Horizon Strings ─────────────────────────────────

export function formatIndicativeReturn(min: number, max: number): string {
  if (min === max) {
    return `Database-listed indicative return: ${min}% p.a.`;
  }
  return `Database-listed indicative return range: ${min}% – ${max}%`;
}

export function formatHorizonYears(minYears: number, maxYears: number): string {
  if (minYears === maxYears) {
    return `${minYears}+ Years`;
  }
  return `${minYears}–${maxYears} Years`;
}

// ── User Financial Goal (created by Calculator) ───────────────────────────────

export interface UserFinancialGoal {
  id: string;
  title: string;
  monthlyInvestment: number;          // ₹ / month initial
  annualStepUpPercent: number;        // % annual step-up
  startYear: number;                  // e.g. 2026
  targetMaturityYear: number;         // e.g. 2036
  expectedGrowthPercent: number;      // annual return %
  inflationPercent: number;           // annual inflation %
  targetMaturityAmount: number;       // Nominal final maturity corpus
  inflationAdjustedTarget: number;    // Real value in today's purchasing power
  requiredMonthlyInvestment?: number; // Needed to meet target corpus
  beatsInflation: boolean;            // Whether growth > inflation
  goalType?: string;                  // e.g. "Wealth Creation", "Retirement", etc.
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
 * Normalizes any record from `investment_products` into a typed InvestmentProduct.
 */
export function normalizeInvestment(raw: Record<string, unknown>, index: number): InvestmentProduct {
  const id = String(raw.id ?? `inv-${index + 1}`);
  const name = String(raw.name ?? `Investment Option #${index + 1}`);
  const type = String(raw.type ?? "SIP / Mutual Funds");
  const provider = String(raw.provider ?? "Regulated Institution");
  const description = raw.description ? String(raw.description) : null;
  const risk_level = String(raw.risk_level ?? raw.risk ?? "Moderate");

  // Parse returns
  let retMin = typeof raw.expected_return_min === "number" ? raw.expected_return_min : parseFloat(String(raw.expected_return_min || ""));
  let retMax = typeof raw.expected_return_max === "number" ? raw.expected_return_max : parseFloat(String(raw.expected_return_max || ""));
  if (isNaN(retMin)) retMin = 8.0;
  if (isNaN(retMax)) retMax = retMin >= 10 ? retMin + 2 : 12.0;

  // Parse minimum investment
  let minInv = typeof raw.minimum_investment === "number" ? raw.minimum_investment : parseInt(String(raw.minimum_investment || "").replace(/[^\d]/g, ""), 10);
  if (isNaN(minInv) || minInv < 0) minInv = 500;

  // Parse horizons
  let hMin = typeof raw.horizon_min_years === "number" ? raw.horizon_min_years : parseInt(String(raw.horizon_min_years || ""), 10);
  let hMax = typeof raw.horizon_max_years === "number" ? raw.horizon_max_years : parseInt(String(raw.horizon_max_years || ""), 10);
  if (isNaN(hMin) || hMin <= 0) hMin = 3;
  if (isNaN(hMax) || hMax < hMin) hMax = hMin + 2;

  const lock_in_years = typeof raw.lock_in_years === "number" ? raw.lock_in_years : raw.lock_in_years ? parseInt(String(raw.lock_in_years), 10) : null;
  const liquidity = String(raw.liquidity ?? "Standard");
  const goal_types = raw.goal_types ? (Array.isArray(raw.goal_types) ? raw.goal_types : String(raw.goal_types)) : null;
  const regulatory_status = String(raw.regulatory_status ?? "SEBI / RBI Regulated");
  const source_name = String(raw.source_name ?? raw.source ?? "Database");
  const source_url = raw.source_url ? String(raw.source_url) : null;
  const last_updated = String(raw.last_updated ?? new Date().toISOString().split("T")[0]);

  // Identifiers (Do not display empty fields)
  const isin = raw.isin && String(raw.isin).trim().length > 0 ? String(raw.isin).trim() : null;
  const ticker_symbol = raw.ticker_symbol && String(raw.ticker_symbol).trim().length > 0 ? String(raw.ticker_symbol).trim() : null;
  const exchange = raw.exchange && String(raw.exchange).trim().length > 0 ? String(raw.exchange).trim() : null;
  const currency = raw.currency && String(raw.currency).trim().length > 0 ? String(raw.currency).trim() : "INR";
  const data_as_of = raw.data_as_of && String(raw.data_as_of).trim().length > 0 ? String(raw.data_as_of).trim() : null;
  const product_status = raw.product_status ? String(raw.product_status) : "Active";
  const is_active = raw.is_active !== undefined ? Boolean(raw.is_active) : true;

  const indicative_return_range = formatIndicativeReturn(retMin, retMax);
  const horizon = formatHorizonYears(hMin, hMax);

  return {
    id,
    name,
    type,
    provider,
    description,
    risk_level,
    expected_return_min: retMin,
    expected_return_max: retMax,
    minimum_investment: minInv,
    horizon_min_years: hMin,
    horizon_max_years: hMax,
    lock_in_years,
    liquidity,
    goal_types,
    regulatory_status,
    source_name,
    source_url,
    last_updated,
    isin,
    ticker_symbol,
    exchange,
    currency,
    data_as_of,
    product_status,
    is_active,

    indicative_return_range,
    horizon,
    risk: risk_level,
    source: source_name,
    raw,
  };
}

/**
 * Dynamically fetches investment records strictly from `investment_products`.
 * Does NOT modify, create, or seed any table.
 */
export async function fetchInvestmentsFromSupabase(): Promise<{
  data: InvestmentProduct[];
  error: string | null;
  tableName: string;
}> {
  const supabase = createClient();
  const tableName = "investment_products";

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*");

    if (error) {
      return {
        data: [],
        error: error.message,
        tableName,
      };
    }

    if (Array.isArray(data)) {
      // Filter active products if `is_active` flag is set
      const activeOnly = data.filter((item) => {
        if (item && typeof item === "object" && "is_active" in item) {
          return (item as { is_active?: boolean | null }).is_active !== false;
        }
        return true;
      });

      const normalized = activeOnly.map((item, idx) =>
        normalizeInvestment(item as Record<string, unknown>, idx)
      );

      return { data: normalized, error: null, tableName };
    }

    return { data: [], error: null, tableName };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to query Supabase.";
    return { data: [], error: msg, tableName };
  }
}

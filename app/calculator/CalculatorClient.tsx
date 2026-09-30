"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, HelpCircle, RotateCcw,
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  Download, ChevronDown, ChevronUp, ShieldCheck, Target,
  Calendar, Layers, Percent, DollarSign, Compass,
} from "lucide-react";
import {
  formatINR, formatINRCompact,
  calculateFutureValuePlan,
  type FutureValueInput,
  type FutureValuePlanResult,
  type YearProjection,
} from "@/app/lib/finance";
import { buildGoalFromCalculator, persistGoal } from "@/app/lib/investments";
import AppShell, { PageSkeleton } from "@/app/components/AppShell";
import { useAppData } from "@/app/lib/hooks";

// ── Default Parameters ────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_INPUTS: FutureValueInput = {
  monthlyInvestment: 10000,
  annualStepUpPercent: 10,
  startYear: CURRENT_YEAR,
  targetYear: CURRENT_YEAR + 10,
  expectedReturnPercent: 12,
  inflationRatePercent: 6,
  targetRealCorpus: 5000000, // ₹50 Lakhs real target goal
};



// ── Tooltip Component for Financial Terms ─────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        aria-label="More information"
        className="text-[#94A3B8] hover:text-[#0EA5E9] transition-colors focus:outline-none"
      >
        <HelpCircle size={13} />
      </button>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl border border-[#E2E8F0] bg-[#0F172A] p-2.5 text-[11px] font-medium leading-relaxed text-slate-200 shadow-xl z-50 pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0F172A]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Custom Chart Tooltip ───────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function CustomChartTooltip({
  active,
  payload,
  label,
  yearlyProjections,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  yearlyProjections?: YearProjection[];
}) {
  if (!active || !payload?.length) return null;

  const currentYear = Number(label);
  const proj = yearlyProjections?.find((p) => p.calendarYear === currentYear);

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-xl text-xs min-w-[220px]">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 mb-2.5">
        <span className="font-extrabold text-[#0D1B2A] text-sm">Year {currentYear}</span>
        {proj && (
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
            {proj.yearIndex} yr horizon
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {proj && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#64748B]">Monthly SIP (Year {proj.yearIndex}):</span>
            <span className="font-bold text-[#0D1B2A]">{formatINR(proj.monthlyInvestment)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-[#64748B]">
            <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
            Total Contributions:
          </span>
          <span className="font-bold text-[#0D1B2A]">
            {formatINR(proj?.totalInvested ?? 0)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-[#0EA5E9]">
            <span className="h-2 w-2 rounded-full bg-[#0EA5E9]" />
            Projected Value (Nominal):
          </span>
          <span className="font-extrabold text-[#0EA5E9]">
            {formatINR(proj?.futureValue ?? 0)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-[#10B981]">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            Inflation-Adjusted Real Value:
          </span>
          <span className="font-extrabold text-[#10B981]">
            {formatINR(proj?.realValue ?? 0)}
          </span>
        </div>

        {proj && (
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[10px]">
            <span className="text-[#94A3B8]">Est. Returns:</span>
            <span className="font-bold text-emerald-600">+{formatINR(proj.totalReturns)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Future Value Calculator Client ────────────────────────────────────────

export default function CalculatorClient() {
  const router = useRouter();
  const { user, loading, signOut } = useAppData();
  const searchParams = useSearchParams();

  // Inputs State
  const initialMonthly = parseInt(searchParams.get("monthly") || "") || DEFAULT_INPUTS.monthlyInvestment;
  const initialDuration = parseInt(searchParams.get("years") || "") || 10;
  const initialReturn = parseFloat(searchParams.get("return") || "") || DEFAULT_INPUTS.expectedReturnPercent;
  const initialStepUp = parseFloat(searchParams.get("stepUp") || "") || DEFAULT_INPUTS.annualStepUpPercent;

  const [monthlyInvestment, setMonthlyInvestment] = useState(initialMonthly);
  const [annualStepUpPercent, setAnnualStepUpPercent] = useState(initialStepUp);
  const [startYear, setStartYear] = useState(CURRENT_YEAR);
  const [targetYear, setTargetYear] = useState(CURRENT_YEAR + initialDuration);
  const [expectedReturnPercent, setExpectedReturnPercent] = useState(initialReturn);
  const [inflationRatePercent, setInflationRatePercent] = useState(DEFAULT_INPUTS.inflationRatePercent);
  
  // Custom Target Real Goal
  const [targetRealCorpus, setTargetRealCorpus] = useState(5000000); // ₹50 Lakhs

  // Table expansion state
  const [showTable, setShowTable] = useState(false);

  // Synchronize URL parameters if provided (Two-way navigation: Investments -> Calculator)
  useEffect(() => {
    const urlMonthly = parseInt(searchParams.get("monthly") || "");
    const urlYears = parseInt(searchParams.get("years") || "");
    const urlReturn = parseFloat(searchParams.get("return") || "");
    const urlStepUp = parseFloat(searchParams.get("stepUp") || "");
    if (urlMonthly && urlMonthly > 0) setMonthlyInvestment(urlMonthly);
    if (urlYears && urlYears > 0) setTargetYear(startYear + urlYears);
    if (urlReturn && urlReturn > 0) setExpectedReturnPercent(urlReturn);
    if (!isNaN(urlStepUp) && urlStepUp >= 0) setAnnualStepUpPercent(urlStepUp);
  }, [searchParams, startYear]);

  // Derived calculation engine result
  const planResult: FutureValuePlanResult = useMemo(() => {
    return calculateFutureValuePlan({
      monthlyInvestment,
      annualStepUpPercent,
      startYear,
      targetYear,
      expectedReturnPercent,
      inflationRatePercent,
      targetRealCorpus: targetRealCorpus > 0 ? targetRealCorpus : undefined,
    });
  }, [
    monthlyInvestment,
    annualStepUpPercent,
    startYear,
    targetYear,
    expectedReturnPercent,
    inflationRatePercent,
    targetRealCorpus,
  ]);

  const tenureYears = Math.max(1, targetYear - startYear);

  // Sync active goal state so it's always ready for other pages
  useEffect(() => {
    const goal = buildGoalFromCalculator(
      {
        monthlyInvestment,
        annualStepUpPercent,
        startYear,
        targetYear,
        expectedReturnPercent,
        inflationRatePercent,
        targetRealCorpus: targetRealCorpus > 0 ? targetRealCorpus : undefined,
      },
      planResult,
      "Wealth Creation"
    );
    persistGoal(goal);
  }, [
    monthlyInvestment,
    annualStepUpPercent,
    startYear,
    targetYear,
    expectedReturnPercent,
    inflationRatePercent,
    targetRealCorpus,
    planResult,
  ]);

  // Two-way navigation: Calculator -> Investments ("Explore Investments for This Goal")
  const handleExploreInvestments = () => {
    const goal = buildGoalFromCalculator(
      {
        monthlyInvestment,
        annualStepUpPercent,
        startYear,
        targetYear,
        expectedReturnPercent,
        inflationRatePercent,
        targetRealCorpus: targetRealCorpus > 0 ? targetRealCorpus : undefined,
      },
      planResult,
      "Wealth Creation"
    );
    persistGoal(goal);
    router.push("/investments");
  };

  // Reset to default settings
  function handleReset() {
    setMonthlyInvestment(DEFAULT_INPUTS.monthlyInvestment);
    setAnnualStepUpPercent(DEFAULT_INPUTS.annualStepUpPercent);
    setStartYear(CURRENT_YEAR);
    setTargetYear(CURRENT_YEAR + 10);
    setExpectedReturnPercent(DEFAULT_INPUTS.expectedReturnPercent);
    setInflationRatePercent(DEFAULT_INPUTS.inflationRatePercent);
    setTargetRealCorpus(5000000);
  }

  // Export year-by-year projections as CSV
  function handleExportCSV() {
    const headers = [
      "Year",
      "Horizon (Years)",
      "Monthly SIP (INR)",
      "Annual Contribution (INR)",
      "Total Invested (INR)",
      "Projected Nominal FV (INR)",
      "Estimated Returns (INR)",
      "Inflation Adjusted Real Value (INR)",
      "Inflation Erosion (INR)",
    ];

    const rows = planResult.yearlyProjections.map((p) => [
      p.calendarYear,
      p.yearIndex,
      p.monthlyInvestment,
      p.annualContribution,
      p.totalInvested,
      p.futureValue,
      p.totalReturns,
      p.realValue,
      p.inflationImpact,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `autoX_Future_Value_${startYear}_to_${targetYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) return <PageSkeleton />;

  return (
    <AppShell user={user} onSignOut={signOut}>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        
        {/* ── Top Header & Reset Action ──────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500 text-white shadow-xs font-bold text-xs">
                FV
              </span>
              <h1 className="text-xl font-extrabold tracking-tight text-[#0D1B2A]">
                Future Value & Inflation Calculator
              </h1>
            </div>
            <p className="text-sm text-[#8BA3B8]">
              Model your step-up SIP compounding, see nominal returns, and inspect real purchasing power after inflation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExploreInvestments}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-sky-600 hover:to-sky-700 transition"
            >
              <Compass size={14} />
              <span>Explore Investments for This Goal →</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#475569] shadow-2xs hover:border-sky-300 hover:text-sky-600 transition"
            >
              <RotateCcw size={13} />
              Reset Defaults
            </button>
          </div>
        </div>

        {/* ── Investment Pre-fill Banner (Two-way navigation feedback) ── */}
        {searchParams.get("investment") && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-xs text-sky-950 shadow-xs">
            <div className="flex items-start gap-2.5">
              <Sparkles size={17} className="text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-[#0D1B2A]">
                  Pre-filled Parameters for: <span className="text-sky-700 underline decoration-sky-300">{searchParams.get("investment")}</span>
                </p>
                <p className="mt-0.5 text-sky-800">
                  Target return pre-set to {expectedReturnPercent}% p.a. based on this product&apos;s indicative range. Adjust sliders below to run custom sensitivity tests.
                </p>
              </div>
            </div>
            <button
              onClick={handleExploreInvestments}
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white border border-sky-300 px-3.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-2xs"
            >
              <span>Back to Investments</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* ── Main Interactive Layout ────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* ── LEFT COLUMN: INPUT CONTROLS & SLIDERS (5 Cols) ────────────────── */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-sky-600" />
                  <h2 className="text-sm font-extrabold text-[#0D1B2A]">Investment Parameters</h2>
                </div>
                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
                  Live Recalculation
                </span>
              </div>

              <div className="space-y-5">
                {/* 1. Monthly Investment (₹) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#334155] flex items-center">
                      Monthly Investment
                      <InfoTooltip text="The starting monthly SIP amount you invest in Year 1." />
                    </label>
                    <span className="font-extrabold text-sm text-[#0EA5E9]">
                      {formatINR(monthlyInvestment)}
                    </span>
                  </div>

                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-[#94A3B8]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={monthlyInvestment || ""}
                      onChange={(e) => setMonthlyInvestment(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 pl-8 pr-3 text-xs font-extrabold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                      placeholder="e.g. 10000"
                    />
                  </div>
                </div>

                {/* 2. Annual Step-Up (%) */}
                <div className="pt-3 border-t border-[#F8FAFC]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#334155] flex items-center">
                      Annual Step-up Increase
                      <InfoTooltip text="Increasing your monthly SIP every year to match salary increments dramatically compounds wealth." />
                    </label>
                    <span className="font-extrabold text-sm text-[#0D1B2A]">
                      {annualStepUpPercent}% / yr
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={annualStepUpPercent}
                      onChange={(e) => setAnnualStepUpPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 px-3.5 pr-8 text-xs font-extrabold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                      placeholder="e.g. 10"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-bold text-[#94A3B8]">
                      %
                    </span>
                  </div>
                </div>

                {/* 3. Starting Year & Target Maturity Year */}
                <div className="pt-3 border-t border-[#F8FAFC]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#334155] flex items-center">
                      Investment Horizon
                      <InfoTooltip text="The starting year and target maturity year when you plan to withdraw or access the corpus." />
                    </label>
                    <span className="font-extrabold text-xs text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
                      {tenureYears} Years ({tenureYears * 12} Months)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#94A3B8] block mb-1">Start Year</span>
                      <input
                        type="number"
                        min={2000}
                        max={2060}
                        value={startYear}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || CURRENT_YEAR;
                          setStartYear(val);
                          if (targetYear <= val) setTargetYear(val + 10);
                        }}
                        className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 px-3 text-xs font-bold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#94A3B8] block mb-1">Maturity Year</span>
                      <input
                        type="number"
                        min={startYear + 1}
                        max={startYear + 60}
                        value={targetYear}
                        onChange={(e) => setTargetYear(Math.max(startYear + 1, parseInt(e.target.value) || (startYear + 1)))}
                        className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 px-3 text-xs font-bold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Expected Annual Growth / Return (%) */}
                <div className="pt-3 border-t border-[#F8FAFC]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#334155] flex items-center">
                      Expected Annual Return
                      <InfoTooltip text="Nominal compound annual growth rate (CAGR). Indian equity mutual funds have historically delivered 12–14% CAGR over 10+ years." />
                    </label>
                    <span className="font-extrabold text-sm text-emerald-600">
                      {expectedReturnPercent}% p.a.
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={expectedReturnPercent}
                      onChange={(e) => setExpectedReturnPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 px-3.5 pr-14 text-xs font-bold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                      placeholder="e.g. 12"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-bold text-[#94A3B8]">
                      % p.a.
                    </span>
                  </div>
                </div>

                {/* 5. Expected Inflation Rate (%) */}
                <div className="pt-3 border-t border-[#F8FAFC]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#334155] flex items-center">
                      Expected Inflation Rate
                      <InfoTooltip text="Annual rate of price increase. Over 2000–2024, India's CPI inflation averaged ~6.0%." />
                    </label>
                    <span className="font-extrabold text-sm text-red-500">
                      {inflationRatePercent}% / yr
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      value={inflationRatePercent}
                      onChange={(e) => setInflationRatePercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 px-3.5 pr-12 text-xs font-bold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                      placeholder="e.g. 6"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-bold text-[#94A3B8]">
                      % / yr
                    </span>
                  </div>
                </div>

                {/* 6. Target Wealth Goal (Optional) */}
                <div className="pt-3 border-t border-[#F1F5F9]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Target size={14} className="text-sky-600" />
                      <span className="text-xs font-bold text-[#0D1B2A]">Target Wealth Goal (Optional)</span>
                      <InfoTooltip text="Set a target goal in today's purchasing power to see monthly investment recommendations." />
                    </div>
                    {targetRealCorpus > 0 && (
                      <span className="font-extrabold text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                        {formatINRCompact(targetRealCorpus)}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-[#94A3B8]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100000}
                      value={targetRealCorpus || ""}
                      onChange={(e) => setTargetRealCorpus(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="e.g. 5000000 (leave 0 if none)"
                      className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 pl-8 pr-3 text-xs font-extrabold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: LIVE RESULTS, RECOMMENDATION & CHART (7 Cols) ───── */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* ── CARD A: HERO MATURITY & INFLATION STATUS ─────────────────────── */}
            <div className="rounded-3xl border border-[#E2E8F0] bg-gradient-to-br from-white via-white to-sky-50/50 p-6 shadow-[0_1px_4px_rgb(15_23_42/0.05)]">
              {/* Top Status Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3 mb-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">
                  Projected Maturity at Year {targetYear}
                </span>

                {planResult.beatsInflation ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Beats Inflation by +{(expectedReturnPercent - inflationRatePercent).toFixed(1)}% Real Spread</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200 shadow-2xs">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>Lags Inflation by -{(inflationRatePercent - expectedReturnPercent).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Major Value Display */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-[#8BA3B8] mb-0.5">Target Maturity Amount (Nominal)</p>
                  <p className="text-3xl sm:text-4xl font-black tracking-tight text-[#0D1B2A]">
                    {formatINR(planResult.maturityAmount)}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Full cash payout in {targetYear}
                  </p>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold text-sky-900">Real Value After Inflation</p>
                    <ShieldCheck size={15} className="text-sky-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-sky-950">
                    {formatINR(planResult.realValueAfterInflation)}
                  </p>
                  <p className="mt-1 text-[11px] text-sky-700 leading-tight">
                    Worth in today&apos;s purchasing power ({planResult.recommendation.realGrowthMultiple} real multiplier)
                  </p>
                </div>
              </div>

              {/* Sub-row: Inflation Impact Breakdown */}
              <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#64748B]">
                  Cumulative Inflation Impact: <strong className="font-extrabold text-red-500">−{formatINR(planResult.inflationImpact)}</strong> lost to purchasing power decay
                </span>
                <span className="font-bold text-[#0D1B2A]">
                  Net Real Wealth Gain: <strong className={planResult.amountAboveBelowInflation >= 0 ? "text-emerald-600" : "text-red-500"}>
                    {planResult.amountAboveBelowInflation >= 0 ? "+" : ""}{formatINR(planResult.amountAboveBelowInflation)}
                  </strong>
                </span>
              </div>

              {/* Sub-row: Quick Navigation to Investments */}
              <div className="mt-4 pt-3.5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#64748B]">
                  Calculated Goal: <strong className="text-[#0D1B2A]">{formatINR(monthlyInvestment)}/mo</strong> to reach <strong className="text-sky-600">{formatINR(planResult.maturityAmount)}</strong> by {targetYear}
                </div>
                <button
                  onClick={handleExploreInvestments}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-600 transition"
                >
                  <Compass size={14} />
                  <span>Explore Investments for This Goal →</span>
                </button>
              </div>
            </div>

            {/* ── CARD B: 4-GRID LIVE RESULTS ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                <p className="text-[11px] font-semibold text-[#8BA3B8]">Total Invested</p>
                <p className="mt-1 text-base font-extrabold text-[#0D1B2A]">
                  {formatINRCompact(planResult.totalInvested)}
                </p>
                <p className="mt-0.5 text-[10px] text-[#64748B]">
                  Over {tenureYears} yrs ({annualStepUpPercent}% step-up)
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                <p className="text-[11px] font-semibold text-[#8BA3B8]">Estimated Returns</p>
                <p className="mt-1 text-base font-extrabold text-emerald-600">
                  +{formatINRCompact(planResult.totalEstimatedReturns)}
                </p>
                <p className="mt-0.5 text-[10px] text-[#64748B]">
                  Growth: {(planResult.maturityAmount / (planResult.totalInvested || 1)).toFixed(1)}x nominal
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                <p className="text-[11px] font-semibold text-[#8BA3B8]">Inflation Benchmark</p>
                <p className="mt-1 text-base font-extrabold text-[#0D1B2A]">
                  {formatINRCompact(planResult.inflationBenchmark)}
                </p>
                <p className="mt-0.5 text-[10px] text-[#64748B]">
                  Cost at {inflationRatePercent}% inflation
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                <p className="text-[11px] font-semibold text-[#8BA3B8]">Nominal Beat Margin</p>
                <p className={`mt-1 text-base font-extrabold ${planResult.nominalBeatsBy >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {planResult.nominalBeatsBy >= 0 ? "+" : ""}{formatINRCompact(planResult.nominalBeatsBy)}
                </p>
                <p className="mt-0.5 text-[10px] text-[#64748B]">
                  Above inflation cost
                </p>
              </div>
            </div>

            {/* ── CARD C: SMART RECOMMENDATION BANNER ─────────────────────────── */}
            <div className={`rounded-3xl border p-5 transition-all ${
              planResult.beatsInflation
                ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                : "border-amber-200 bg-amber-50/50 text-amber-950"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                  planResult.beatsInflation ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                }`}>
                  <Sparkles size={17} />
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-extrabold">
                    {planResult.beatsInflation ? "Smart Financial Plan Review" : "Action Needed to Beat Inflation"}
                  </h3>
                  
                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    {planResult.recommendation.explanation}
                  </p>

                  {/* Recommendation action box if lagging */}
                  {!planResult.beatsInflation && (
                    <div className="mt-3.5 rounded-2xl border border-amber-300 bg-white p-3.5 shadow-xs">
                      <p className="text-xs font-bold text-amber-900">
                        💡 Key Takeaway:
                      </p>
                      <p className="mt-1 text-xs text-[#334155] leading-relaxed">
                        To generate positive real wealth, adjust your investment allocation to target at least <strong>{planResult.recommendation.recommendedReturnRate}% p.a.</strong> return, or invest approximately <strong>{formatINR(planResult.recommendation.recommendedMonthlyInvestment ?? 0)}/month</strong>.
                      </p>
                      <button
                        onClick={() => {
                          if (planResult.recommendation.recommendedReturnRate) {
                            setExpectedReturnPercent(planResult.recommendation.recommendedReturnRate);
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                      >
                        Adopt {planResult.recommendation.recommendedReturnRate}% Return Target →
                      </button>
                    </div>
                  )}

                  {/* Goal Recommendation if target real corpus is active */}
                  {planResult.beatsInflation && targetRealCorpus > 0 && planResult.recommendation.recommendedMonthlyInvestment && (
                    <div className="mt-3 rounded-2xl border border-sky-200 bg-white p-3 shadow-xs">
                      <p className="text-xs font-bold text-sky-900">
                        🎯 Goal Achievement Recommendation:
                      </p>
                      <p className="mt-1 text-xs text-[#334155] leading-relaxed">
                        You need to invest approximately <strong>{formatINR(planResult.recommendation.recommendedMonthlyInvestment)}/month</strong> (with your current {annualStepUpPercent}% annual step-up) to achieve your target of <strong>{formatINR(targetRealCorpus)}</strong> in real purchasing power by {targetYear}.
                      </p>
                      <button
                        onClick={() => {
                          if (planResult.recommendation.recommendedMonthlyInvestment) {
                            setMonthlyInvestment(planResult.recommendation.recommendedMonthlyInvestment);
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-600 transition"
                      >
                        Apply {formatINR(planResult.recommendation.recommendedMonthlyInvestment)}/mo →
                      </button>
                    </div>
                  )}

                  {/* ── Explore Investments for This Goal Banner ── */}
                  <div className="mt-4 rounded-2xl border border-sky-300 bg-gradient-to-r from-sky-500 to-sky-600 p-4 text-white shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-100">
                          <Compass size={14} /> Ready to Execute This Plan?
                        </div>
                        <p className="mt-0.5 text-sm font-black">
                          Explore SEBI / RBI Investments for This {formatINR(planResult.maturityAmount)} Goal
                        </p>
                        <p className="text-[11px] text-sky-100/90 leading-snug">
                          Dynamically match mutual funds, bonds, stocks, gold, and crypto from your database against your {tenureYears}-year timeline.
                        </p>
                      </div>
                      <button
                        onClick={handleExploreInvestments}
                        className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-sky-700 shadow-sm hover:bg-sky-50 transition"
                      >
                        <span>Explore Investments for This Goal</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD D: INTERACTIVE RECHARTS CHART ───────────────────────────── */}
            <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0D1B2A]">
                    Investment Value vs Inflation-Adjusted Value
                  </h3>
                  <p className="text-xs text-[#8BA3B8]">
                    Real-time month-by-month compounding progression from {startYear} to {targetYear}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0EA5E9]" />
                    <span className="font-semibold text-[#0D1B2A]">Projected (Nominal)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                    <span className="font-semibold text-[#0D1B2A]">Real (Inflation-Adjusted)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
                    <span className="font-semibold text-[#64748B]">Total Invested</span>
                  </div>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-72 sm:h-84">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={planResult.yearlyProjections}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <XAxis
                      dataKey="calendarYear"
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                      interval={Math.ceil(tenureYears / 7)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatINRCompact(v)}
                    />

                    <Tooltip
                      content={
                        <CustomChartTooltip yearlyProjections={planResult.yearlyProjections} />
                      }
                    />

                    {/* Total Invested line */}
                    <Area
                      type="monotone"
                      dataKey="totalInvested"
                      name="Total Invested"
                      stroke="#94A3B8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="transparent"
                      dot={false}
                    />

                    {/* Inflation-Adjusted Real Value area */}
                    <Area
                      type="monotone"
                      dataKey="realValue"
                      name="Inflation-Adjusted Value"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fill="url(#realGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#10B981", strokeWidth: 0 }}
                    />

                    {/* Nominal Projected Value area */}
                    <Area
                      type="monotone"
                      dataKey="futureValue"
                      name="Projected Value"
                      stroke="#0EA5E9"
                      strokeWidth={2.5}
                      fill="url(#nominalGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#0EA5E9", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <p className="mt-3 text-center text-[11px] text-[#94A3B8]">
                💡 Tap or hover over any year to inspect exact monthly contributions, real purchasing power, and compounding gain.
              </p>
            </div>
          </div>
        </div>

        {/* ── EXPANDABLE YEAR-BY-YEAR PROJECTION TABLE ───────────────────────── */}
        <div className="mt-8 rounded-3xl border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
          <button
            onClick={() => setShowTable(!showTable)}
            className="flex w-full items-center justify-between p-5 sm:p-6 text-left hover:bg-[#F8FAFC] transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0D1B2A]">
                  Year-by-Year Future Value Breakdown
                </h3>
                <p className="text-xs text-[#8BA3B8]">
                  Detailed audit of monthly SIP increases, contributions, returns, and inflation discount factors
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600">
                {showTable ? "Hide Schedule" : `View ${planResult.yearlyProjections.length} Years`}
              </span>
              {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {showTable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-[#E2E8F0] p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#64748B]">
                    Full schedule for <strong>{tenureYears} years</strong> ({startYear} to {targetYear}) at {expectedReturnPercent}% CAGR and {inflationRatePercent}% inflation.
                  </p>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0D1B2A] hover:bg-slate-50 transition"
                  >
                    <Download size={13} />
                    Export CSV
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="py-2.5 px-3 text-left font-bold text-[#64748B]">Year</th>
                        <th className="py-2.5 px-3 text-right font-bold text-[#64748B]">Monthly SIP</th>
                        <th className="py-2.5 px-3 text-right font-bold text-[#64748B]">Annual Deposit</th>
                        <th className="py-2.5 px-3 text-right font-bold text-[#64748B]">Total Invested</th>
                        <th className="py-2.5 px-3 text-right font-bold text-sky-700">Projected Value (FV)</th>
                        <th className="py-2.5 px-3 text-right font-bold text-emerald-700">Total Returns</th>
                        <th className="py-2.5 px-3 text-right font-bold text-green-700">Real Value (Today ₹)</th>
                        <th className="py-2.5 px-3 text-right font-bold text-red-500">Inflation Erosion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {planResult.yearlyProjections.map((p) => (
                        <tr key={p.calendarYear} className="hover:bg-[#F8FAFC] transition">
                          <td className="py-2.5 px-3 font-extrabold text-[#0D1B2A]">
                            {p.calendarYear} <span className="text-[10px] font-normal text-[#94A3B8]">({p.yearIndex}yr)</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#334155] font-semibold">
                            {formatINR(p.monthlyInvestment)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#64748B]">
                            {formatINR(p.annualContribution)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#0D1B2A] font-semibold">
                            {formatINR(p.totalInvested)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-sky-600">
                            {formatINR(p.futureValue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            +{formatINR(p.totalReturns)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-green-700 bg-emerald-50/20">
                            {formatINR(p.realValue)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-red-500 font-medium">
                            −{formatINR(p.inflationImpact)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── METHODOLOGY & FINANCIAL ASSUMPTIONS ────────────────────────────── */}
        <div className="mt-8 rounded-3xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
          <h3 className="text-sm font-extrabold text-[#0D1B2A] mb-2">
            Calculation Methodology & Financial Assumptions
          </h3>
          <div className="grid gap-4 sm:grid-cols-3 text-xs text-[#64748B]">
            <div className="rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] p-3.5">
              <p className="font-bold text-[#0D1B2A] mb-1">1. Monthly Compounding</p>
              <p className="leading-relaxed">
                Investments are compounded at the beginning of each month at the rate $r_m = (r / 100) / 12$. Standard practice for Indian mutual fund SIPs.
              </p>
            </div>
            <div className="rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] p-3.5">
              <p className="font-bold text-[#0D1B2A] mb-1">2. Annual Step-up Schedule</p>
              <p className="leading-relaxed">
                Monthly SIP increases by {annualStepUpPercent}% every 12 months: P_y = P_1 × (1 + step_up)^(y−1), compounding your contributions alongside income growth.
              </p>
            </div>
            <div className="rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] p-3.5">
              <p className="font-bold text-[#0D1B2A] mb-1">3. Fisher Inflation Deflation</p>
              <p className="leading-relaxed">
                Real value represents true purchasing power in today&apos;s rupees: Real Value = FV / (1 + inf)^N. Only real wealth buys goods and services.
              </p>
            </div>
          </div>
        </div>

        <p id="disclaimer" className="mt-8 text-center text-[11px] text-[#94A3B8]">
          autoX Financial Planning Engine · All projections are illustrative and based on mathematical compounding models. Mutual fund investments are subject to market risks.
        </p>
      </div>
    </AppShell>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Sparkles,
  Calculator,
  ShieldCheck,
  Filter,
  Search,
  ArrowRight,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Bot,
  Send,
  ExternalLink,
  Layers,
  Clock,
  Compass,
  Database,
  Calendar,
  X,
  PlusCircle,
  HelpCircle,
} from "lucide-react";
import AppShell, { PageSkeleton } from "@/app/components/AppShell";
import { useAppData } from "@/app/lib/hooks";
import { formatINR, formatINRCompact } from "@/app/lib/finance";
import {
  type InvestmentProduct,
  type UserFinancialGoal,
  INVESTMENT_CATEGORIES,
  useActiveGoal,
  fetchInvestmentsFromSupabase,
} from "@/app/lib/investments";
import {
  matchInvestmentToGoal,
  filterAndRankInvestments,
  DEFAULT_FILTERS,
  type InvestmentFilters,
  parseReturnRange,
} from "@/app/lib/investment-matching";

export default function InvestmentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading, signOut } = useAppData();
  const { goal, updateGoal } = useActiveGoal();

  // Supabase Data State
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [resolvedTable, setResolvedTable] = useState<string>("investments");

  // Filters State
  const [filters, setFilters] = useState<InvestmentFilters>(DEFAULT_FILTERS);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [expandedMatchCard, setExpandedMatchCard] = useState<string | null>(null);

  // AI Assistant Drawer State
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Schema Guide Modal State
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);

  // Fetch investments dynamically from Supabase
  const loadInvestments = useCallback(async () => {
    setLoadingProducts(true);
    setSupabaseError(null);
    try {
      const result = await fetchInvestmentsFromSupabase();
      setProducts(result.data);
      setResolvedTable(result.tableName);
      if (result.error && result.data.length === 0) {
        setSupabaseError(result.error);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to query Supabase.";
      setSupabaseError(msg);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  // Handle URL pre-filtered category if any
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setFilters((prev) => ({ ...prev, category: categoryParam }));
    }
  }, [searchParams]);

  // Ranked and filtered products
  const rankedItems = useMemo(() => {
    return filterAndRankInvestments(products, goal, filters);
  }, [products, goal, filters]);

  // Two-way navigation: Investment -> Calculator
  const handleCalculateForInvestment = (inv: InvestmentProduct) => {
    const { avg } = parseReturnRange(inv.indicative_return_range);
    const tenureYears = Math.max(1, goal.targetMaturityYear - goal.startYear);
    const monthly = Math.max(goal.monthlyInvestment, inv.minimum_investment);

    const query = new URLSearchParams({
      monthly: String(monthly),
      return: String(Math.round(avg)),
      years: String(tenureYears),
      stepUp: String(goal.annualStepUpPercent),
      investment: inv.name,
      ref: "investments",
    });

    router.push(`/calculator?${query.toString()}`);
  };

  // Trigger AI analysis with preset prompt
  const handleAskAIAboutProduct = (inv: InvestmentProduct) => {
    setAiOpen(true);
    const prompt = `Analyze why ${inv.name} by ${inv.provider} matches or differs from my ${goal.title || "active financial goal"}. Explain liquidity, return expectation, and any potential funding gap.`;
    handleSendAI(prompt);
  };

  // Send message to AI Investment Assistant
  const handleSendAI = async (messageText?: string) => {
    const text = messageText || aiInput.trim();
    if (!text || aiLoading) return;

    const userMsg = { id: `user-${Date.now()}`, role: "user" as const, content: text };
    setAiMessages((prev) => [...prev, userMsg]);
    if (!messageText) setAiInput("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: aiMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          goal,
          products,
        }),
      });

      if (!res.ok) throw new Error("AI Assistant error");
      const data = await res.json();
      const assistantMsg = {
        id: `ai-${Date.now()}`,
        role: "assistant" as const,
        content: data.reply || "I analyzed your goal and database investments.",
      };
      setAiMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I had trouble connecting to the Investment Assistant. Please verify your Supabase connectivity and try again.",
        },
      ]);
    } finally {
      setAiLoading(false);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  };

  if (userLoading) {
    return <PageSkeleton />;
  }

  const tenureYears = Math.max(1, goal.targetMaturityYear - goal.startYear);

  return (
    <AppShell user={user} onSignOut={signOut}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* ── 1. HEADER & ACTIONS ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                <Compass size={18} />
              </span>
              <h1 className="text-xl font-extrabold tracking-tight text-[#0D1B2A] sm:text-2xl">
                Investment Discovery
              </h1>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
                Goal-Matched
              </span>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Discover investment options dynamically fetched from your Supabase database, matched to your Future Value goal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Supabase status badge */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs shadow-xs">
              <Database size={13} className={products.length > 0 ? "text-emerald-500" : "text-amber-500"} />
              <span className="font-semibold text-[#0D1B2A]">
                Supabase: <code className="text-sky-600 font-mono text-[11px]">{resolvedTable}</code>
              </span>
              <span className="rounded-full bg-[#F1F5F9] px-1.5 py-0.2 text-[10px] font-bold text-[#64748B]">
                {products.length} products
              </span>
            </div>

            {/* Refresh from Supabase */}
            <button
              onClick={loadInvestments}
              disabled={loadingProducts}
              title="Refresh records from Supabase"
              className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] shadow-xs hover:bg-[#F8FAFC] disabled:opacity-50 transition"
            >
              <RefreshCw size={13} className={loadingProducts ? "animate-spin text-sky-500" : "text-[#64748B]"} />
              <span>Refresh</span>
            </button>

            {/* AI Advisor Button */}
            <button
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:from-sky-600 hover:to-sky-700 transition"
            >
              <Bot size={14} />
              <span>AI Investment Copilot</span>
            </button>
          </div>
        </div>

        {/* ── 2. ACTIVE FINANCIAL GOAL CARD ───────────────────────────────── */}
        <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-white via-sky-50/40 to-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-sky-100 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
                <TrendingUp size={22} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                    Active Financial Goal
                  </span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    {goal.goalType || "Wealth Creation"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      goal.beatsInflation
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {goal.beatsInflation ? "✓ Outpaces Inflation" : "⚠️ Lags Inflation"}
                  </span>
                </div>
                <h2 className="mt-0.5 text-lg font-black text-[#0D1B2A]">
                  Target: {formatINR(goal.targetMaturityAmount)}{" "}
                  <span className="text-sm font-semibold text-[#64748B]">
                    by {goal.targetMaturityYear} ({tenureYears} Years)
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/calculator"
                className="flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 shadow-xs transition"
              >
                <Calculator size={13} />
                <span>Adjust Goal in Calculator</span>
              </Link>
            </div>
          </div>

          {/* 10 Core Goal Parameters Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* 1. Monthly Investment */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Monthly Investment</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                {formatINR(goal.monthlyInvestment)}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Initial monthly contribution</p>
            </div>

            {/* 2. Annual Step-Up */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Annual Step-Up</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                +{goal.annualStepUpPercent}% / year
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Annual savings increase</p>
            </div>

            {/* 3. Starting Year */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Starting Year</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">{goal.startYear}</p>
              <p className="text-[10px] text-[#8BA3B8]">Initial investment start</p>
            </div>

            {/* 4. Target Maturity Year */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Target Maturity</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                {goal.targetMaturityYear}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">{tenureYears} years investment horizon</p>
            </div>

            {/* 5. Expected Growth % */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Expected Growth</p>
              <p className="mt-0.5 text-sm font-extrabold text-sky-600">
                {goal.expectedGrowthPercent}% p.a.
              </p>
              <p className="text-[10px] text-[#8BA3B8]">{goal.riskPreference || "Moderate"} scenario</p>
            </div>

            {/* 6. Inflation % */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Inflation Benchmark</p>
              <p className="mt-0.5 text-sm font-extrabold text-amber-600">
                {goal.inflationPercent}% p.a.
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Annual price rise assumption</p>
            </div>

            {/* 7. Target Maturity Amount */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Nominal Target</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                {formatINR(goal.targetMaturityAmount)}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Maturity value in {goal.targetMaturityYear}</p>
            </div>

            {/* 8. Inflation-Adjusted Target */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Real Purchasing Power</p>
              <p className="mt-0.5 text-sm font-extrabold text-emerald-600">
                {formatINR(goal.inflationAdjustedTarget)}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">In today’s constant rupees</p>
            </div>

            {/* 9. Required Monthly Investment */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Required Monthly</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                {formatINR(goal.requiredMonthlyInvestment || goal.monthlyInvestment)}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Recommended monthly baseline</p>
            </div>

            {/* 10. Beats Inflation Indicator */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Beats Inflation?</p>
              <p
                className={`mt-0.5 text-sm font-extrabold ${
                  goal.beatsInflation ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {goal.beatsInflation
                  ? `Yes (+${(goal.expectedGrowthPercent - goal.inflationPercent).toFixed(1)}% Real)`
                  : `Lagging (-${(goal.inflationPercent - goal.expectedGrowthPercent).toFixed(1)}%)`}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">
                {goal.beatsInflation ? "Generates positive real wealth" : "Risk of capital erosion"}
              </p>
            </div>
          </div>
        </div>

        {/* ── 3. FILTERING & SEARCH CONTROLS ──────────────────────────────── */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search investments by name, provider, category, or regulation..."
                value={filters.searchQuery}
                onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-[#0D1B2A] placeholder-[#94A3B8] focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, searchQuery: "" }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0D1B2A]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Filter Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category */}
              <select
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                className="rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] focus:border-sky-500 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {INVESTMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Risk */}
              <select
                value={filters.risk}
                onChange={(e) => setFilters((prev) => ({ ...prev, risk: e.target.value }))}
                className="rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] focus:border-sky-500 focus:outline-none"
              >
                <option value="All">All Risk Levels</option>
                <option value="Low">Low Risk</option>
                <option value="Moderate">Moderate Risk</option>
                <option value="High">High Risk</option>
                <option value="Very High">Very High Risk</option>
              </select>

              {/* Horizon */}
              <select
                value={filters.horizon}
                onChange={(e) => setFilters((prev) => ({ ...prev, horizon: e.target.value }))}
                className="rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] focus:border-sky-500 focus:outline-none"
              >
                <option value="All">All Horizons</option>
                <option value="< 3 Years">&lt; 3 Years (Short-term)</option>
                <option value="3-5 Years">3 - 5 Years (Medium-term)</option>
                <option value="5+ Years">5+ Years (Long-term)</option>
                <option value="7+ Years">7+ Years (Multi-cycle)</option>
              </select>

              {/* Minimum Investment */}
              <select
                value={filters.minInvestment}
                onChange={(e) => setFilters((prev) => ({ ...prev, minInvestment: e.target.value }))}
                className="rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] focus:border-sky-500 focus:outline-none"
              >
                <option value="All">Any Min. Deposit</option>
                <option value="<= 500">≤ ₹500</option>
                <option value="<= 1000">≤ ₹1,000</option>
                <option value="<= 5000">≤ ₹5,000</option>
                <option value="<= 10000">≤ ₹10,000</option>
              </select>

              {/* Sort By */}
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, sortBy: e.target.value as InvestmentFilters["sortBy"] }))
                }
                className="rounded-xl border border-sky-200 bg-sky-50/50 px-2.5 py-1.5 text-xs font-bold text-sky-800 focus:border-sky-500 focus:outline-none"
              >
                <option value="match">Sort: Goal Match Score</option>
                <option value="return">Sort: Highest Indicative Return</option>
                <option value="min_invest">Sort: Lowest Min. Investment</option>
                <option value="risk">Sort: Risk Tier (Low to High)</option>
              </select>

              {(filters.category !== "All" ||
                filters.risk !== "All" ||
                filters.horizon !== "All" ||
                filters.minInvestment !== "All" ||
                filters.searchQuery) && (
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. INVESTMENT PRODUCT CARDS ─────────────────────────────────── */}
        {loadingProducts ? (
          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-12 text-center shadow-xs">
            <RefreshCw size={28} className="mx-auto animate-spin text-sky-500 mb-3" />
            <p className="text-sm font-bold text-[#0D1B2A]">Querying Supabase database...</p>
            <p className="mt-1 text-xs text-[#8BA3B8]">
              Connecting to table <code className="font-mono text-sky-600">{resolvedTable}</code>
            </p>
          </div>
        ) : products.length === 0 ? (
          /* ── Supabase Empty / Not Yet Populated State ─────────────────── */
          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-8 sm:p-10 shadow-xs">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Database size={28} />
              </div>
              <h2 className="text-lg font-extrabold text-[#0D1B2A]">
                Supabase Connected — Ready for Your Investment Data
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                Your Supabase client is connected to project{" "}
                <code className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[11px] text-sky-700">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL || "supabase"}
                </code>
                . In accordance with your instructions, <strong>autoX does not create, modify, or seed any Supabase tables</strong>.
              </p>

              {supabaseError && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    Supabase Notice:
                  </div>
                  <p className="mt-1 font-mono text-[11px] opacity-90">{supabaseError}</p>
                </div>
              )}

              <p className="mt-4 text-xs font-semibold text-[#0D1B2A]">
                Once you create your table and insert your investment records in Supabase, they will automatically appear here with real-time goal matching.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={loadInvestments}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-600 transition"
                >
                  <RefreshCw size={13} /> Check for Records Now
                </button>
                <button
                  onClick={() => setShowSchemaGuide(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-[#334155] shadow-xs hover:bg-[#F8FAFC] transition"
                >
                  <Info size={13} className="text-sky-600" /> View Expected Table Schema
                </button>
              </div>
            </div>
          </div>
        ) : rankedItems.length === 0 ? (
          /* Filter returned no matches */
          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-12 text-center shadow-xs">
            <Filter size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
            <p className="text-sm font-bold text-[#0D1B2A]">No products matched your filters</p>
            <p className="mt-1 text-xs text-[#8BA3B8]">
              Try broadening your category, risk level, or minimum investment filters.
            </p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-3 inline-block rounded-xl bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-600 hover:bg-sky-100 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* Grid of Investment Product Cards */
          <div className="grid gap-5 md:grid-cols-2">
            {rankedItems.map(({ investment, match }) => {
              const isExpanded = expandedMatchCard === investment.id;

              return (
                <div
                  key={investment.id}
                  className="group flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgb(15_23_42/0.04)] hover:border-sky-300 hover:shadow-[0_4px_16px_rgb(14_165_233/0.08)] transition-all"
                >
                  <div>
                    {/* Header: Title, Provider, Type & Regulation */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                            {investment.type}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              investment.risk.toLowerCase().includes("low")
                                ? "bg-emerald-50 text-emerald-700"
                                : investment.risk.toLowerCase().includes("mod")
                                ? "bg-amber-50 text-amber-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {investment.risk} Risk
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                            <ShieldCheck size={11} className="text-emerald-600" />
                            {investment.regulatory_status}
                          </span>
                        </div>

                        <h3 className="mt-2 text-base font-extrabold text-[#0D1B2A] group-hover:text-sky-600 transition-colors">
                          {investment.name}
                        </h3>
                        <p className="text-xs font-medium text-[#64748B]">
                          Provider: <span className="font-semibold text-[#0D1B2A]">{investment.provider}</span>
                        </p>
                      </div>

                      {/* Goal Match Badge */}
                      <div className="shrink-0 text-right">
                        <div className="inline-flex flex-col items-end">
                          <div className="flex items-center gap-1 rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
                            <Sparkles size={12} className="text-sky-500" />
                            <span>{match.score}% Goal Match</span>
                          </div>
                          <span className="mt-0.5 text-[10px] font-bold text-[#64748B]">
                            {match.matchQuality}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Key Database Attributes Grid */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#F8FAFC] p-3 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-medium text-[#8BA3B8]">Indicative Return</p>
                        <p className="mt-0.5 font-black text-sky-600">
                          {investment.indicative_return_range}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-[#8BA3B8]">Min. Investment</p>
                        <p className="mt-0.5 font-bold text-[#0D1B2A]">
                          {formatINR(investment.minimum_investment)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-[#8BA3B8]">Horizon</p>
                        <p className="mt-0.5 font-bold text-[#0D1B2A]">{investment.horizon}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-[#8BA3B8]">Liquidity</p>
                        <p className="mt-0.5 font-bold text-[#0D1B2A]">{investment.liquidity}</p>
                      </div>
                    </div>

                    {/* Why this matches your goal section */}
                    <div className="mt-3.5 rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                          Goal Match Breakdown
                        </span>
                        <button
                          onClick={() =>
                            setExpandedMatchCard(isExpanded ? null : investment.id)
                          }
                          className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                        >
                          {isExpanded ? (
                            <>
                              Hide details <ChevronUp size={12} />
                            </>
                          ) : (
                            <>
                              Why this fits ({match.reasons.length}) <ChevronDown size={12} />
                            </>
                          )}
                        </button>
                      </div>

                      {/* Primary highlight reason */}
                      <p className="mt-1 text-xs text-[#334155] leading-relaxed">
                        ✓ {match.reasons[0] || "Horizon and risk profile align with your target tenure."}
                      </p>

                      {/* Funding gap / surplus indicator */}
                      <div className="mt-2 text-[11px]">
                        {match.fundingGap.hasGap ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2 text-amber-900 leading-snug">
                            <span className="font-bold">⚠️ Funding Gap Notice: </span>
                            {match.fundingGap.explanation}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-emerald-900 leading-snug">
                            <span className="font-bold">✓ Target Feasibility: </span>
                            {match.fundingGap.explanation}
                          </div>
                        )}
                      </div>

                      {/* Expanded reasons and caveats */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 space-y-1.5 border-t border-sky-100 pt-2 text-xs"
                          >
                            <p className="text-[10px] font-bold uppercase text-sky-800">Specific Fit Factors:</p>
                            {match.reasons.slice(1).map((r, idx) => (
                              <p key={idx} className="text-[#334155] leading-relaxed">
                                • {r}
                              </p>
                            ))}
                            {match.caveats.length > 0 && (
                              <div className="mt-2 pt-1 border-t border-amber-100">
                                <p className="text-[10px] font-bold uppercase text-amber-800">Considerations:</p>
                                {match.caveats.map((c, idx) => (
                                  <p key={idx} className="text-amber-900 leading-relaxed text-[11px]">
                                    ⚠️ {c}
                                  </p>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Metadata: Source & Last Updated */}
                    <div className="mt-3 flex items-center justify-between text-[10px] text-[#8BA3B8] px-1">
                      <span>Source: {investment.source}</span>
                      <span>Updated: {investment.last_updated}</span>
                    </div>
                  </div>

                  {/* ── Action Buttons: Two-Way Navigation ─────────────────── */}
                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleCalculateForInvestment(investment)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-600 transition"
                    >
                      <Calculator size={13} />
                      <span>Calculate for My Goal →</span>
                    </button>

                    <button
                      onClick={() => handleAskAIAboutProduct(investment)}
                      title="Ask AI Copilot to analyze this product"
                      className="flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
                    >
                      <Bot size={13} />
                      <span className="hidden sm:inline">Ask AI</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 5. REGULATORY & MATHEMATICAL DISCLAIMER ───────────────────────── */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFD] p-4 text-[11px] text-[#64748B] leading-relaxed">
          <p className="font-bold text-[#0D1B2A]">
            Regulatory Notice & Mathematical Modeling Disclaimer:
          </p>
          <p className="mt-0.5">
            autoX Investment Discovery Engine is strictly an analytical planning interface. All investment products and parameters are loaded directly from your Supabase database. Indicative returns and growth projections are mathematical simulations based on compounding formulas; they do NOT constitute guaranteed returns, investment advice, or commercial endorsements. Securities, mutual funds, and market investments are subject to market risks. Past returns are not indicative of future performance. Please consult a SEBI-registered Investment Adviser (RIA) before committing capital.
          </p>
        </div>

        {/* ── 6. AI COPILOT SLIDE-OVER DRAWER ─────────────────────────────── */}
        <AnimatePresence>
          {aiOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setAiOpen(false)}
                className="fixed inset-0 z-50 bg-[#0D1B2A]"
              />

              {/* Drawer */}
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-sm">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#0D1B2A]">
                        AI Investment Copilot
                      </h3>
                      <p className="text-[10px] text-[#8BA3B8]">
                        Grounded strictly on your active goal & Supabase database
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAiOpen(false)}
                    className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0D1B2A]"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Quick Prompts */}
                <div className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Quick Inquiries:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() =>
                        handleSendAI(
                          `Which options in my database best fit my ${formatINR(
                            goal.targetMaturityAmount
                          )} goal by ${goal.targetMaturityYear}?`
                        )
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:border-sky-300 hover:text-sky-600 transition"
                    >
                      🎯 Best fit for {formatINRCompact(goal.targetMaturityAmount)}
                    </button>
                    <button
                      onClick={() =>
                        handleSendAI(
                          "Is there any funding gap with my current monthly investment? How can I close it?"
                        )
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:border-sky-300 hover:text-sky-600 transition"
                    >
                      📊 Check funding gap
                    </button>
                    <button
                      onClick={() =>
                        handleSendAI(
                          "Compare the top 2 investment options currently in my Supabase database."
                        )
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:border-sky-300 hover:text-sky-600 transition"
                    >
                      ⚖️ Compare top 2 options
                    </button>
                    <button
                      onClick={() =>
                        handleSendAI(
                          "Explain the liquidity terms and lock-in implications of my database options."
                        )
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:border-sky-300 hover:text-sky-600 transition"
                    >
                      💧 Explain liquidity terms
                    </button>
                  </div>
                </div>

                {/* Messages Body */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {aiMessages.length === 0 ? (
                    <div className="py-12 text-center">
                      <Compass size={32} className="mx-auto mb-2 text-[#CBD5E1]" />
                      <p className="text-xs font-bold text-[#0D1B2A]">
                        Ask anything about your investment options
                      </p>
                      <p className="mx-auto mt-1 max-w-xs text-[11px] text-[#8BA3B8] leading-relaxed">
                        I analyze your Future Value goal against products stored in your Supabase database. I will never invent imaginary products.
                      </p>
                    </div>
                  ) : (
                    aiMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white">
                            <Bot size={14} />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-sky-500 font-medium text-white shadow-xs"
                              : "border border-[#E2E8F0] bg-[#F8FAFC] text-[#0D1B2A] whitespace-pre-line"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}

                  {aiLoading && (
                    <div className="flex items-center gap-2 text-xs text-[#8BA3B8] pt-2">
                      <RefreshCw size={13} className="animate-spin text-sky-500" />
                      <span>AI Copilot is analyzing your goal and database...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="border-t border-[#E2E8F0] p-3 bg-white">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAI();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask about returns, funding gap, or comparisons..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      disabled={aiLoading}
                      className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs text-[#0D1B2A] placeholder-[#94A3B8] focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiInput.trim()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-xs hover:bg-sky-600 disabled:opacity-50 transition"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── 7. TABLE SCHEMA GUIDE MODAL ──────────────────────────────────── */}
        <AnimatePresence>
          {showSchemaGuide && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSchemaGuide(false)}
                className="fixed inset-0 z-50 bg-[#0D1B2A]"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-2xl rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <div className="flex items-center gap-2">
                      <Database size={18} className="text-sky-500" />
                      <h3 className="text-base font-extrabold text-[#0D1B2A]">
                        Supabase Table Schema Guide
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowSchemaGuide(false)}
                      className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-[#64748B] leading-relaxed">
                    Create a table named <code className="font-bold text-sky-700">investments</code> (or set <code className="font-bold text-sky-700">NEXT_PUBLIC_INVESTMENTS_TABLE</code>) in your Supabase database with these recommended columns:
                  </p>

                  <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-[#E2E8F0] text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold uppercase text-[#64748B]">
                        <tr>
                          <th className="p-2.5">Column Name</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Example Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px]">
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">name</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">NIFTY 50 Index Fund Direct Growth</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">type</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">SIP / Mutual Funds</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">provider</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">HDFC Mutual Fund</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">risk</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">Moderate</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">indicative_return_range</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">12% - 14%</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">minimum_investment</td>
                          <td className="p-2.5 text-[#64748B]">numeric</td>
                          <td className="p-2.5 text-[#334155]">500</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">horizon</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">5+ Years</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">liquidity</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">High (T+1 Settlement)</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">regulatory_status</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">SEBI Registered</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">source</td>
                          <td className="p-2.5 text-[#64748B]">text</td>
                          <td className="p-2.5 text-[#334155]">AMFI / NSE</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-sky-700">last_updated</td>
                          <td className="p-2.5 text-[#64748B]">date / text</td>
                          <td className="p-2.5 text-[#334155]">2026-09-30</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setShowSchemaGuide(false)}
                      className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 transition"
                    >
                      Got it
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}

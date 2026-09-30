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
  Eye,
  SlidersHorizontal,
  Scale,
  Target,
  Check,
  Lock,
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
  checkDataFreshness,
  formatIndicativeReturn,
} from "@/app/lib/investments";
import {
  matchInvestmentToGoal,
  filterAndRankInvestments,
  DEFAULT_FILTERS,
  type InvestmentFilters,
  type GoalMatchResult,
} from "@/app/lib/investment-matching";

type ContextualTab = "overview" | "explore" | "my-goals" | "compare";

export default function InvestmentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading, signOut } = useAppData();
  const { goal } = useActiveGoal();

  // Contextual Navigation Tab: Overview, Explore, My Goals, Compare
  const [activeTab, setActiveTab] = useState<ContextualTab>(() => {
    const tabParam = searchParams.get("tab") as ContextualTab;
    if (tabParam && ["overview", "explore", "my-goals", "compare"].includes(tabParam)) {
      return tabParam;
    }
    return "overview";
  });

  // Supabase Data State
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<InvestmentFilters>(DEFAULT_FILTERS);
  const [expandedMatchCard, setExpandedMatchCard] = useState<string | null>(null);

  // Detailed View Modal State
  const [selectedProduct, setSelectedProduct] = useState<InvestmentProduct | null>(null);

  // Compare State (Up to 3 products)
  const [compareList, setCompareList] = useState<string[]>([]);

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

  // Fetch investments dynamically strictly from `investment_products`
  const loadInvestments = useCallback(async () => {
    setLoadingProducts(true);
    setSupabaseError(null);
    try {
      const result = await fetchInvestmentsFromSupabase();
      setProducts(result.data);
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

  // Synchronize category or view from URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setFilters((prev) => ({ ...prev, category: categoryParam }));
      setActiveTab("explore");
    }
    const tabParam = searchParams.get("tab") as ContextualTab;
    if (tabParam && ["overview", "explore", "my-goals", "compare"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Ranked and filtered products
  const rankedItems = useMemo(() => {
    return filterAndRankInvestments(products, goal, filters);
  }, [products, goal, filters]);

  // Top 3 matched products for Overview tab
  const topMatched = useMemo(() => {
    return filterAndRankInvestments(products, goal, DEFAULT_FILTERS).slice(0, 3);
  }, [products, goal]);

  // Two-way navigation: Investment -> Calculator
  const handleCalculateForInvestment = (inv: InvestmentProduct) => {
    const tenureYears = Math.max(1, goal.targetMaturityYear - goal.startYear);
    const avgReturn = Math.round((inv.expected_return_min + inv.expected_return_max) / 2);
    const monthly = Math.max(goal.monthlyInvestment, inv.minimum_investment);

    const query = new URLSearchParams({
      monthly: String(monthly),
      return: String(avgReturn),
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
    const prompt = `Analyze why ${inv.name} by ${inv.provider} matches or differs from my active goal (${formatINR(goal.targetMaturityAmount)} by ${goal.targetMaturityYear}). Explain liquidity, database-listed indicative return range, and potential contribution gaps.`;
    handleSendAI(prompt);
  };

  // Compare toggle
  const toggleCompare = (id: string) => {
    setCompareList((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id]; // keep max 3
      }
      return [...prev, id];
    });
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
    } catch {
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
                Investments
              </h1>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
                Supabase Connected
              </span>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Explore investment options dynamically fetched from your database table <code className="font-mono text-sky-700 font-bold">investment_products</code> and matched to your Future Value goal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Supabase status badge */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs shadow-xs">
              <Database size={13} className={products.length > 0 ? "text-emerald-500" : "text-amber-500"} />
              <span className="font-semibold text-[#0D1B2A]">
                investment_products
              </span>
              <span className="rounded-full bg-[#F1F5F9] px-1.5 py-0.2 text-[10px] font-bold text-[#64748B]">
                {products.length} items
              </span>
            </div>

            {/* Refresh */}
            <button
              onClick={loadInvestments}
              disabled={loadingProducts}
              title="Refresh from Supabase"
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

        {/* ── 2. CONTEXTUAL NAVIGATION TABS ───────────────────────────────── */}
        <div className="flex overflow-x-auto pb-1 scrollbar-none">
          <div className="inline-flex items-center gap-1.5 rounded-2xl bg-[#E2E8F0]/50 p-1 text-xs font-bold text-[#64748B]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition-all ${
                activeTab === "overview"
                  ? "bg-white text-sky-700 shadow-xs"
                  : "hover:text-[#0D1B2A]"
              }`}
            >
              <Compass size={14} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("explore")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition-all ${
                activeTab === "explore"
                  ? "bg-white text-sky-700 shadow-xs"
                  : "hover:text-[#0D1B2A]"
              }`}
            >
              <Search size={14} />
              <span>Explore Catalog ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("my-goals")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition-all ${
                activeTab === "my-goals"
                  ? "bg-white text-sky-700 shadow-xs"
                  : "hover:text-[#0D1B2A]"
              }`}
            >
              <Target size={14} />
              <span>My Goals</span>
            </button>

            <button
              onClick={() => setActiveTab("compare")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition-all ${
                activeTab === "compare"
                  ? "bg-white text-sky-700 shadow-xs"
                  : "hover:text-[#0D1B2A]"
              }`}
            >
              <Scale size={14} />
              <span>Compare {compareList.length > 0 ? `(${compareList.length})` : ""}</span>
            </button>
          </div>
        </div>

        {/* ── 3. ACTIVE FINANCIAL GOAL HERO BANNER ─────────────────────────── */}
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
                <span>Adjust in Calculator</span>
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
              <p className="text-[10px] text-[#8BA3B8]">Initial monthly SIP</p>
            </div>

            {/* 2. Annual Step-Up */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Annual Step-Up</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                +{goal.annualStepUpPercent}% / year
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Annual increase</p>
            </div>

            {/* 3. Starting Year */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Starting Year</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">{goal.startYear}</p>
              <p className="text-[10px] text-[#8BA3B8]">Beginning year</p>
            </div>

            {/* 4. Target Maturity Year */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Target Maturity</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                {goal.targetMaturityYear}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">{tenureYears} yrs horizon</p>
            </div>

            {/* 5. Expected Growth % */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Expected Growth</p>
              <p className="mt-0.5 text-sm font-extrabold text-sky-600">
                {goal.expectedGrowthPercent}% p.a.
              </p>
              <p className="text-[10px] text-[#8BA3B8]">{goal.riskPreference || "Moderate"} model</p>
            </div>

            {/* 6. Inflation % */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Inflation Benchmark</p>
              <p className="mt-0.5 text-sm font-extrabold text-amber-600">
                {goal.inflationPercent}% p.a.
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Assumed inflation rate</p>
            </div>

            {/* 7. Target Maturity Amount */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Target Amount</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                {formatINR(goal.targetMaturityAmount)}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Nominal target</p>
            </div>

            {/* 8. Inflation-Adjusted Target */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Real Target</p>
              <p className="mt-0.5 text-sm font-extrabold text-emerald-600">
                {formatINR(goal.inflationAdjustedTarget)}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">Today&apos;s purchasing power</p>
            </div>

            {/* 9. Required Monthly Investment */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Required Monthly</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#0D1B2A]">
                {formatINR(goal.requiredMonthlyInvestment || goal.monthlyInvestment)}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">To hit real target</p>
            </div>

            {/* 10. Inflation Status */}
            <div className="rounded-2xl border border-sky-100/80 bg-white/90 p-3 shadow-2xs">
              <p className="text-[11px] font-medium text-[#64748B]">Inflation Status</p>
              <p
                className={`mt-0.5 text-sm font-extrabold ${
                  goal.beatsInflation ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {goal.beatsInflation
                  ? `+${(goal.expectedGrowthPercent - goal.inflationPercent).toFixed(1)}% Spread`
                  : `Lagging by -${(goal.inflationPercent - goal.expectedGrowthPercent).toFixed(1)}%`}
              </p>
              <p className="text-[10px] text-[#8BA3B8]">
                {goal.beatsInflation ? "Positive real wealth" : "Negative real yield"}
              </p>
            </div>
          </div>
        </div>

        {/* ── 4. TAB CONTENT ──────────────────────────────────────────────── */}

        {/* ── TAB A: OVERVIEW ─────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
                <p className="text-xs font-semibold text-[#8BA3B8]">Database Products</p>
                <p className="mt-1 text-2xl font-black text-[#0D1B2A]">{products.length}</p>
                <p className="text-[11px] text-[#64748B]">Table: investment_products</p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
                <p className="text-xs font-semibold text-[#8BA3B8]">Active Goal Tenure</p>
                <p className="mt-1 text-2xl font-black text-sky-600">{tenureYears} Years</p>
                <p className="text-[11px] text-[#64748B]">{goal.startYear} → {goal.targetMaturityYear}</p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
                <p className="text-xs font-semibold text-[#8BA3B8]">Monthly Contribution</p>
                <p className="mt-1 text-2xl font-black text-[#0D1B2A]">{formatINR(goal.monthlyInvestment)}</p>
                <p className="text-[11px] text-[#64748B]">+{goal.annualStepUpPercent}% annual step-up</p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
                <p className="text-xs font-semibold text-[#8BA3B8]">Inflation Benchmark</p>
                <p className="mt-1 text-2xl font-black text-amber-600">{goal.inflationPercent}%</p>
                <p className="text-[11px] text-[#64748B]">Real spread target: &gt;0%</p>
              </div>
            </div>

            {/* Top Matched Picks Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0D1B2A]">
                    Top Goal-Matched Options
                  </h3>
                  <p className="text-xs text-[#8BA3B8]">
                    Calculated matching against your {tenureYears}-year timeline and monthly contribution
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("explore")}
                  className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700"
                >
                  <span>Explore All ({products.length})</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {products.length === 0 ? (
                <div className="rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-xs">
                  <Database size={24} className="mx-auto mb-2 text-[#CBD5E1]" />
                  <p className="text-sm font-bold text-[#0D1B2A]">No products in Supabase yet</p>
                  <p className="mt-1 text-xs text-[#8BA3B8]">
                    Upload investment records to your Supabase table to view automated goal matching.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {topMatched.map(({ investment, match }) => (
                    <div
                      key={investment.id}
                      className="flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-xs hover:border-sky-300 hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                            {investment.type}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                            {match.score}% Fit
                          </span>
                        </div>

                        <h4 className="mt-2 text-sm font-extrabold text-[#0D1B2A] line-clamp-1">
                          {investment.name}
                        </h4>
                        <p className="text-[11px] text-[#64748B]">
                          Provider: <span className="font-semibold text-[#0D1B2A]">{investment.provider}</span>
                        </p>

                        <div className="mt-3 rounded-2xl bg-[#F8FAFC] p-3 text-xs space-y-1">
                          <p className="text-[11px] text-[#64748B]">
                            {match.headline}
                          </p>
                          <p className="text-[11px] font-bold text-sky-700">
                            {formatIndicativeReturn(investment.expected_return_min, investment.expected_return_max)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center gap-2">
                        <button
                          onClick={() => handleCalculateForInvestment(investment)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-600 transition shadow-2xs"
                        >
                          <Calculator size={12} />
                          <span>Calculate for My Goal →</span>
                        </button>
                        <button
                          onClick={() => setSelectedProduct(investment)}
                          className="rounded-xl border border-[#E2E8F0] bg-white p-1.5 text-[#64748B] hover:text-[#0D1B2A] hover:bg-[#F8FAFC] transition"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Discovery Cards */}
            <div>
              <h3 className="text-sm font-extrabold text-[#0D1B2A] mb-3">
                Browse by Category
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {INVESTMENT_CATEGORIES.map((cat) => {
                  const count = products.filter((p) =>
                    p.type.toLowerCase().includes(cat.toLowerCase().split(" ")[0])
                  ).length;

                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, category: cat }));
                        setActiveTab("explore");
                      }}
                      className="flex flex-col items-start rounded-2xl border border-[#E2E8F0] bg-white p-3.5 text-left shadow-2xs hover:border-sky-300 hover:bg-sky-50/30 transition group"
                    >
                      <span className="text-xs font-bold text-[#0D1B2A] group-hover:text-sky-600 transition">
                        {cat}
                      </span>
                      <span className="mt-1 text-[11px] text-[#8BA3B8]">
                        {count} available
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB B: EXPLORE CATALOG ──────────────────────────────────────── */}
        {activeTab === "explore" && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Search */}
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Search by name, provider, ISIN, ticker, regulation..."
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

                {/* Filters Row */}
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
                    <option value="3-5 Years">3 – 5 Years (Medium-term)</option>
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
                    <option value="return">Sort: Indicative Return Max</option>
                    <option value="min_invest">Sort: Lowest Min. Investment</option>
                    <option value="risk">Sort: Risk Level</option>
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

            {/* Investment Products Catalog Grid */}
            {loadingProducts ? (
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-12 text-center shadow-xs">
                <RefreshCw size={28} className="mx-auto animate-spin text-sky-500 mb-3" />
                <p className="text-sm font-bold text-[#0D1B2A]">Fetching from Supabase...</p>
                <p className="mt-1 text-xs text-[#8BA3B8]">Querying table investment_products</p>
              </div>
            ) : products.length === 0 ? (
              /* Empty Database notice */
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-8 sm:p-10 shadow-xs">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Database size={28} />
                  </div>
                  <h2 className="text-lg font-extrabold text-[#0D1B2A]">
                    Supabase Connected — Table Ready
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                    Table <code className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-sky-700 font-bold">investment_products</code> is connected. In accordance with safety rules, autoX does not create or seed mock data.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[#0D1B2A]">
                    Once you upload your investment records into Supabase, they will automatically populate here with full goal matching.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={loadInvestments}
                      className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 transition shadow-xs"
                    >
                      <RefreshCw size={13} /> Refresh Supabase Data
                    </button>
                    <button
                      onClick={() => setShowSchemaGuide(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-[#334155] hover:bg-[#F8FAFC] transition shadow-2xs"
                    >
                      <Info size={13} className="text-sky-600" /> View Table Columns Guide
                    </button>
                  </div>
                </div>
              </div>
            ) : rankedItems.length === 0 ? (
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-12 text-center shadow-xs">
                <Filter size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
                <p className="text-sm font-bold text-[#0D1B2A]">No products matched your filters</p>
                <p className="mt-1 text-xs text-[#8BA3B8]">Try adjusting or resetting your search filters.</p>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-3 rounded-xl bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-600 hover:bg-sky-100 transition"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {rankedItems.map(({ investment, match }) => {
                  const isExpanded = expandedMatchCard === investment.id;
                  const freshness = checkDataFreshness(investment.last_updated);
                  const isCompared = compareList.includes(investment.id);

                  return (
                    <div
                      key={investment.id}
                      className="group flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgb(15_23_42/0.04)] hover:border-sky-300 hover:shadow-[0_4px_16px_rgb(14_165_233/0.08)] transition-all"
                    >
                      <div>
                        {/* Header: Title, Provider, Badges */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                {investment.type}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  investment.risk_level.toLowerCase().includes("low")
                                    ? "bg-emerald-50 text-emerald-700"
                                    : investment.risk_level.toLowerCase().includes("mod")
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-purple-50 text-purple-700"
                                }`}
                              >
                                {investment.risk_level} Risk
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                                <ShieldCheck size={11} className="text-emerald-600" />
                                {investment.regulatory_status}
                              </span>
                              {freshness.isStale && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                  ⚠️ Data {freshness.label}
                                </span>
                              )}
                            </div>

                            <h3
                              onClick={() => setSelectedProduct(investment)}
                              className="mt-2 text-base font-extrabold text-[#0D1B2A] group-hover:text-sky-600 cursor-pointer transition-colors"
                            >
                              {investment.name}
                            </h3>
                            <p className="text-xs font-medium text-[#64748B]">
                              Provider: <span className="font-semibold text-[#0D1B2A]">{investment.provider}</span>
                            </p>
                          </div>

                          {/* Match Score */}
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

                        {/* Identifiers when available — Do not display empty fields */}
                        {(investment.isin || investment.ticker_symbol || investment.exchange) && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#64748B] font-mono">
                            {investment.isin && (
                              <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5">
                                ISIN: <strong>{investment.isin}</strong>
                              </span>
                            )}
                            {investment.ticker_symbol && (
                              <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5">
                                Ticker: <strong>{investment.ticker_symbol}</strong>
                              </span>
                            )}
                            {investment.exchange && (
                              <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5">
                                Exchange: <strong>{investment.exchange}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Database attributes grid */}
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#F8FAFC] p-3 text-xs sm:grid-cols-4">
                          <div>
                            <p className="text-[10px] font-medium text-[#8BA3B8]">Indicative Return</p>
                            <p className="mt-0.5 font-bold text-sky-700 text-[11px] leading-tight">
                              {investment.expected_return_min}% – {investment.expected_return_max}%
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

                        {/* Goal Match Highlight box with exact headline specification */}
                        <div className="mt-3.5 rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-sky-900">
                              &gt; {match.headline}
                            </span>
                            <button
                              onClick={() => setExpandedMatchCard(isExpanded ? null : investment.id)}
                              className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                            >
                              {isExpanded ? "Less" : "Why it matches"}
                            </button>
                          </div>

                          <p className="mt-1 text-xs text-[#334155] leading-relaxed">
                            ✓ {match.reasons[0] || "Horizon and risk profile align with your target tenure."}
                          </p>

                          {/* Funding Gap Notice */}
                          {match.fundingGap.hasGap ? (
                            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/80 p-2 text-[11px] text-amber-900 leading-snug">
                              <span className="font-bold">⚠️ Contribution Notice: </span>
                              {match.fundingGap.explanation}
                            </div>
                          ) : (
                            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-[11px] text-emerald-900 leading-snug">
                              <span className="font-bold">✓ Target Feasibility: </span>
                              {match.fundingGap.explanation}
                            </div>
                          )}

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 space-y-1 border-t border-sky-100 pt-2 text-xs text-[#334155]"
                              >
                                {match.reasons.slice(1).map((r, i) => (
                                  <p key={i}>• {r}</p>
                                ))}
                                {match.caveats.map((c, i) => (
                                  <p key={i} className="text-amber-900 text-[11px]">⚠️ {c}</p>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Metadata: Source & Last Updated */}
                        <div className="mt-3 flex items-center justify-between text-[10px] text-[#8BA3B8] px-1">
                          <span>
                            Source:{" "}
                            {investment.source_url ? (
                              <a
                                href={investment.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-600 underline inline-flex items-center gap-0.5"
                              >
                                {investment.source_name} <ExternalLink size={9} />
                              </a>
                            ) : (
                              investment.source_name
                            )}
                          </span>
                          <span>Last updated: {investment.last_updated}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleCalculateForInvestment(investment)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white hover:bg-sky-600 transition shadow-2xs"
                        >
                          <Calculator size={13} />
                          <span>Calculate for My Goal →</span>
                        </button>

                        <button
                          onClick={() => setSelectedProduct(investment)}
                          className="flex items-center gap-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] transition"
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>

                        <button
                          onClick={() => toggleCompare(investment.id)}
                          className={`flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                            isCompared
                              ? "bg-sky-100 text-sky-800 border border-sky-300"
                              : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-sky-300"
                          }`}
                          title={isCompared ? "Remove from comparison" : "Add to comparison"}
                        >
                          <Scale size={13} />
                          <span className="hidden sm:inline">{isCompared ? "Compared" : "Compare"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB C: MY GOALS DEEP DIVE ────────────────────────────────────── */}
        {activeTab === "my-goals" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#F1F5F9] pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#0D1B2A]">
                    {goal.title || "Active Financial Goal"}
                  </h3>
                  <p className="text-xs text-[#8BA3B8]">
                    Generated by Future Value Calculator on {new Date(goal.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href="/calculator"
                  className="mt-2 sm:mt-0 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 transition shadow-2xs"
                >
                  <Calculator size={13} />
                  <span>Modify in Calculator →</span>
                </Link>
              </div>

              {/* Progress Bar & Horizon */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#0D1B2A]">Horizon Timeline ({goal.startYear} → {goal.targetMaturityYear})</span>
                  <span className="text-sky-600">{tenureYears} Years</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
                    style={{
                      width: `${Math.min(100, Math.max(10, Math.round(((new Date().getFullYear() - goal.startYear + 1) / Math.max(1, tenureYears)) * 100)))}%`,
                    }}
                  />
                </div>
              </div>

              {/* 10-Parameter Inspection Table */}
              <div className="mt-6 rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold uppercase text-[#64748B]">
                    <tr>
                      <th className="p-3">Parameter</th>
                      <th className="p-3">Configured Value</th>
                      <th className="p-3">Financial Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">1. Monthly Investment</td>
                      <td className="p-3 font-mono font-bold text-sky-700">{formatINR(goal.monthlyInvestment)}</td>
                      <td className="p-3 text-[#64748B]">Initial recurring deposit scheduled each month</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">2. Annual Step-Up</td>
                      <td className="p-3 font-mono font-bold text-[#0D1B2A]">+{goal.annualStepUpPercent}% / year</td>
                      <td className="p-3 text-[#64748B]">Automatic increase in contribution each calendar year</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">3. Starting Year</td>
                      <td className="p-3 font-mono text-[#0D1B2A]">{goal.startYear}</td>
                      <td className="p-3 text-[#64748B]">Year compounding begins</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">4. Target Maturity Year</td>
                      <td className="p-3 font-mono text-[#0D1B2A]">{goal.targetMaturityYear}</td>
                      <td className="p-3 text-[#64748B]">Maturity date at {tenureYears} years tenure</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">5. Expected Growth Rate</td>
                      <td className="p-3 font-mono font-bold text-sky-600">{goal.expectedGrowthPercent}% p.a.</td>
                      <td className="p-3 text-[#64748B]">Target compounding rate modeling asset returns</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">6. Inflation Benchmark</td>
                      <td className="p-3 font-mono font-bold text-amber-600">{goal.inflationPercent}% p.a.</td>
                      <td className="p-3 text-[#64748B]">Assumed consumer price inflation index</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">7. Target Maturity Amount</td>
                      <td className="p-3 font-mono font-black text-[#0D1B2A]">{formatINR(goal.targetMaturityAmount)}</td>
                      <td className="p-3 text-[#64748B]">Nominal rupee payout at maturity in {goal.targetMaturityYear}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">8. Inflation-Adjusted Target</td>
                      <td className="p-3 font-mono font-black text-emerald-600">{formatINR(goal.inflationAdjustedTarget)}</td>
                      <td className="p-3 text-[#64748B]">Purchasing power expressed in today&apos;s rupees</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">9. Required Monthly</td>
                      <td className="p-3 font-mono font-bold text-sky-700">{formatINR(goal.requiredMonthlyInvestment || goal.monthlyInvestment)}</td>
                      <td className="p-3 text-[#64748B]">Monthly commitment required to meet purchasing power goal</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#0D1B2A]">10. Inflation Status</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          goal.beatsInflation ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {goal.beatsInflation ? "✓ Outpaces Inflation" : "⚠️ Lags Inflation"}
                        </span>
                      </td>
                      <td className="p-3 text-[#64748B]">
                        {goal.beatsInflation
                          ? `Generates +${(goal.expectedGrowthPercent - goal.inflationPercent).toFixed(1)}% positive real spread`
                          : `Lagging by -${(goal.inflationPercent - goal.expectedGrowthPercent).toFixed(1)}%`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB D: COMPARE VIEW ─────────────────────────────────────────── */}
        {activeTab === "compare" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#F1F5F9] pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#0D1B2A]">
                    Product Comparison Matrix
                  </h3>
                  <p className="text-xs text-[#8BA3B8]">
                    Side-by-side analysis of up to 3 options fetched from Supabase
                  </p>
                </div>
                {compareList.length > 0 && (
                  <button
                    onClick={() => setCompareList([])}
                    className="mt-2 sm:mt-0 text-xs font-bold text-rose-600 hover:underline"
                  >
                    Clear Selected ({compareList.length})
                  </button>
                )}
              </div>

              {compareList.length === 0 ? (
                <div className="py-12 text-center">
                  <Scale size={32} className="mx-auto mb-2 text-[#CBD5E1]" />
                  <p className="text-sm font-bold text-[#0D1B2A]">No products selected for comparison</p>
                  <p className="mt-1 text-xs text-[#8BA3B8]">
                    Go to the <strong>Explore</strong> tab and click &quot;Compare&quot; on any product card.
                  </p>
                  <button
                    onClick={() => setActiveTab("explore")}
                    className="mt-4 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 transition shadow-xs"
                  >
                    Browse Catalog
                  </button>
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0]">
                        <th className="p-3 w-40 font-bold text-[#64748B] bg-[#F8FAFC]">Feature</th>
                        {compareList.map((id) => {
                          const p = products.find((item) => item.id === id);
                          if (!p) return null;
                          return (
                            <th key={p.id} className="p-3 min-w-[220px]">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-[#0D1B2A] text-sm">{p.name}</span>
                                <button
                                  onClick={() => toggleCompare(p.id)}
                                  className="text-[#94A3B8] hover:text-rose-600"
                                  title="Remove"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <span className="text-[10px] text-[#64748B]">{p.provider}</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Category</td>
                        {compareList.map((id) => (
                          <td key={id} className="p-3 font-medium text-[#0D1B2A]">
                            {products.find((p) => p.id === id)?.type}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Indicative Return</td>
                        {compareList.map((id) => {
                          const p = products.find((item) => item.id === id);
                          if (!p) return null;
                          return (
                            <td key={id} className="p-3 font-bold text-sky-700">
                              {p.expected_return_min}% – {p.expected_return_max}%
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Risk Level</td>
                        {compareList.map((id) => (
                          <td key={id} className="p-3 font-bold text-[#0D1B2A]">
                            {products.find((p) => p.id === id)?.risk_level}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Min. Investment</td>
                        {compareList.map((id) => (
                          <td key={id} className="p-3 font-mono font-bold text-[#0D1B2A]">
                            {formatINR(products.find((p) => p.id === id)?.minimum_investment ?? 0)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Horizon</td>
                        {compareList.map((id) => (
                          <td key={id} className="p-3 text-[#0D1B2A]">
                            {products.find((p) => p.id === id)?.horizon}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Lock-in</td>
                        {compareList.map((id) => {
                          const p = products.find((item) => item.id === id);
                          return (
                            <td key={id} className="p-3 text-[#0D1B2A]">
                              {p?.lock_in_years ? `${p.lock_in_years} Years` : "None"}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Liquidity</td>
                        {compareList.map((id) => (
                          <td key={id} className="p-3 text-[#0D1B2A]">
                            {products.find((p) => p.id === id)?.liquidity}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Regulatory Status</td>
                        {compareList.map((id) => (
                          <td key={id} className="p-3 text-[#0D1B2A]">
                            {products.find((p) => p.id === id)?.regulatory_status}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Goal Match</td>
                        {compareList.map((id) => {
                          const p = products.find((item) => item.id === id);
                          if (!p) return null;
                          const m = matchInvestmentToGoal(p, goal);
                          return (
                            <td key={id} className="p-3">
                              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                                {m.score}% Fit
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-[#64748B] bg-[#F8FAFC]">Action</td>
                        {compareList.map((id) => {
                          const p = products.find((item) => item.id === id);
                          if (!p) return null;
                          return (
                            <td key={id} className="p-3">
                              <button
                                onClick={() => handleCalculateForInvestment(p)}
                                className="rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-600 transition shadow-2xs"
                              >
                                Calculate for My Goal →
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 5. REGULATORY & MATHEMATICAL SAFETY NOTICE ─────────────────── */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFD] p-4 text-[11px] text-[#64748B] leading-relaxed">
          <p className="font-bold text-[#0D1B2A]">
            Financial Safety & Regulatory Disclosure:
          </p>
          <p className="mt-0.5">
            Return ranges represent database-listed indicative return ranges and do not constitute guaranteed returns or commitments. Securities, mutual funds, and crypto investments are subject to market risks. Historical return data is not a guarantee of future outcomes. For cryptocurrency platforms, FIU-IND registration reflects AML/CFT reporting compliance and is not a government endorsement or investment safety guarantee. Please consult a SEBI-registered Investment Adviser (RIA) before committing capital.
          </p>
        </div>

        {/* ── 6. INVESTMENT DETAILS MODAL ──────────────────────────────────── */}
        <AnimatePresence>
          {selectedProduct && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedProduct(null)}
                className="fixed inset-0 z-50 bg-[#0D1B2A]"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xl space-y-4"
                >
                  {/* Modal Header */}
                  <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                          {selectedProduct.type}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                          {selectedProduct.regulatory_status}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-[#0D1B2A]">
                        {selectedProduct.name}
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        Provider: <strong className="text-[#0D1B2A]">{selectedProduct.provider}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0D1B2A]"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Overview / Description */}
                  <div>
                    <h4 className="text-xs font-bold text-[#0D1B2A] uppercase tracking-wider mb-1">
                      Overview
                    </h4>
                    <p className="text-xs text-[#334155] leading-relaxed">
                      {selectedProduct.description || "Detailed operational description is unavailable in the database records."}
                    </p>
                  </div>

                  {/* Identifiers (Do not display empty fields) */}
                  {(selectedProduct.isin || selectedProduct.ticker_symbol || selectedProduct.exchange || selectedProduct.currency) && (
                    <div className="rounded-2xl bg-[#F8FAFC] p-3 text-xs">
                      <h4 className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                        Instrument Identifiers
                      </h4>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[11px]">
                        {selectedProduct.isin && (
                          <div>
                            <span className="text-[#8BA3B8] text-[10px] block">ISIN</span>
                            <span className="font-bold text-[#0D1B2A]">{selectedProduct.isin}</span>
                          </div>
                        )}
                        {selectedProduct.ticker_symbol && (
                          <div>
                            <span className="text-[#8BA3B8] text-[10px] block">Ticker</span>
                            <span className="font-bold text-[#0D1B2A]">{selectedProduct.ticker_symbol}</span>
                          </div>
                        )}
                        {selectedProduct.exchange && (
                          <div>
                            <span className="text-[#8BA3B8] text-[10px] block">Exchange</span>
                            <span className="font-bold text-[#0D1B2A]">{selectedProduct.exchange}</span>
                          </div>
                        )}
                        {selectedProduct.currency && (
                          <div>
                            <span className="text-[#8BA3B8] text-[10px] block">Currency</span>
                            <span className="font-bold text-[#0D1B2A]">{selectedProduct.currency}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Database Information Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
                    <div className="rounded-xl border border-[#E2E8F0] p-3">
                      <span className="text-[10px] text-[#8BA3B8] block">Risk Tier</span>
                      <span className="font-extrabold text-[#0D1B2A]">{selectedProduct.risk_level}</span>
                    </div>

                    <div className="rounded-xl border border-[#E2E8F0] p-3">
                      <span className="text-[10px] text-[#8BA3B8] block">Indicative Return</span>
                      <span className="font-extrabold text-sky-700">
                        {selectedProduct.expected_return_min}% – {selectedProduct.expected_return_max}%
                      </span>
                    </div>

                    <div className="rounded-xl border border-[#E2E8F0] p-3">
                      <span className="text-[10px] text-[#8BA3B8] block">Minimum Investment</span>
                      <span className="font-extrabold text-[#0D1B2A]">
                        {formatINR(selectedProduct.minimum_investment)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-[#E2E8F0] p-3">
                      <span className="text-[10px] text-[#8BA3B8] block">Horizon</span>
                      <span className="font-extrabold text-[#0D1B2A]">{selectedProduct.horizon}</span>
                    </div>

                    <div className="rounded-xl border border-[#E2E8F0] p-3">
                      <span className="text-[10px] text-[#8BA3B8] block">Lock-In Period</span>
                      <span className="font-extrabold text-[#0D1B2A]">
                        {selectedProduct.lock_in_years ? `${selectedProduct.lock_in_years} Years` : "No Lock-in"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-[#E2E8F0] p-3">
                      <span className="text-[10px] text-[#8BA3B8] block">Liquidity</span>
                      <span className="font-extrabold text-[#0D1B2A]">{selectedProduct.liquidity}</span>
                    </div>
                  </div>

                  {/* Data Freshness & Source */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-3 text-xs text-[#64748B] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span>Source: <strong>{selectedProduct.source_name}</strong></span>
                      {selectedProduct.source_url && (
                        <a
                          href={selectedProduct.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-sky-600 underline inline-flex items-center gap-0.5"
                        >
                          Visit registry <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      {selectedProduct.data_as_of && (
                        <span>Data as of: <strong>{selectedProduct.data_as_of}</strong></span>
                      )}
                      <span>Last updated: <strong>{selectedProduct.last_updated}</strong></span>
                    </div>
                  </div>

                  {/* Goal Match Highlight */}
                  {(() => {
                    const match = matchInvestmentToGoal(selectedProduct, goal);
                    return (
                      <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-3.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-sky-950 mb-1">
                          <span>Fit for Your Goal: {match.score}% Score</span>
                          <span className="text-sky-700">{match.matchQuality}</span>
                        </div>
                        <p className="text-[11px] text-[#334155]">&gt; {match.headline}</p>
                        <p className="mt-1 text-xs text-[#334155]">✓ {match.reasons[0]}</p>
                      </div>
                    );
                  })()}

                  {/* Modal Footer CTAs */}
                  <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        const inv = selectedProduct;
                        setSelectedProduct(null);
                        handleCalculateForInvestment(inv);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-600 transition shadow-sm"
                    >
                      <Calculator size={14} />
                      <span>Calculate for My Goal →</span>
                    </button>
                    <button
                      onClick={() => {
                        const inv = selectedProduct;
                        setSelectedProduct(null);
                        handleAskAIAboutProduct(inv);
                      }}
                      className="rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
                    >
                      Ask AI Copilot
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* ── 7. AI COPILOT SLIDE-OVER DRAWER ─────────────────────────────── */}
        <AnimatePresence>
          {aiOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setAiOpen(false)}
                className="fixed inset-0 z-50 bg-[#0D1B2A]"
              />

              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl"
              >
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
                        Strictly uses Supabase investment_products
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
                    Inquiries:
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
                      🎯 Best fit options
                    </button>
                    <button
                      onClick={() =>
                        handleSendAI(
                          "Is there any potential contribution gap with my current monthly investment?"
                        )
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:border-sky-300 hover:text-sky-600 transition"
                    >
                      📊 Check contribution gap
                    </button>
                    <button
                      onClick={() =>
                        handleSendAI("Compare the top available options in my database.")
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:border-sky-300 hover:text-sky-600 transition"
                    >
                      ⚖️ Compare options
                    </button>
                    <button
                      onClick={() =>
                        handleSendAI("Explain liquidity terms and lock-in implications.")
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:border-sky-300 hover:text-sky-600 transition"
                    >
                      💧 Explain liquidity
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
                        I analyze products returned from Supabase against your active calculator goal. I will never invent imaginary products or statistics.
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
                      <span>Analyzing goal and Supabase records...</span>
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
                      placeholder="Ask about returns, contribution gaps, or comparisons..."
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

        {/* ── 8. TABLE SCHEMA GUIDE MODAL ──────────────────────────────────── */}
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
                  className="w-full max-w-2xl rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <div className="flex items-center gap-2">
                      <Database size={18} className="text-sky-500" />
                      <h3 className="text-base font-extrabold text-[#0D1B2A]">
                        Supabase Table: investment_products
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowSchemaGuide(false)}
                      className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed">
                    The application queries table <code className="font-bold text-sky-700">investment_products</code> with these supported columns:
                  </p>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-[#E2E8F0] text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold uppercase text-[#64748B]">
                        <tr>
                          <th className="p-2.5">Column</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px]">
                        <tr><td className="p-2 font-bold text-sky-700">name</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">Product name</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">type</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">Asset category</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">provider</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">Institution / AMC / Issuer</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">risk_level</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">Low / Moderate / High / Very High</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">expected_return_min</td><td className="p-2 text-[#64748B]">numeric</td><td className="p-2 text-[#334155]">Min indicative %</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">expected_return_max</td><td className="p-2 text-[#64748B]">numeric</td><td className="p-2 text-[#334155]">Max indicative %</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">minimum_investment</td><td className="p-2 text-[#64748B]">numeric</td><td className="p-2 text-[#334155]">Minimum deposit (₹)</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">horizon_min_years</td><td className="p-2 text-[#64748B]">numeric</td><td className="p-2 text-[#334155]">Min recommended tenure</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">horizon_max_years</td><td className="p-2 text-[#64748B]">numeric</td><td className="p-2 text-[#334155]">Max recommended tenure</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">lock_in_years</td><td className="p-2 text-[#64748B]">numeric</td><td className="p-2 text-[#334155]">Mandatory lock-in (if any)</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">liquidity</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">Settlement cycle (e.g. T+1)</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">regulatory_status</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">SEBI / RBI / FIU-IND</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">isin</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">ISIN code (optional)</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">ticker_symbol</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">Ticker symbol (optional)</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">exchange</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">NSE / BSE (optional)</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">source_name</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">Data provider source</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">source_url</td><td className="p-2 text-[#64748B]">text</td><td className="p-2 text-[#334155]">Registry web link (optional)</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">data_as_of</td><td className="p-2 text-[#64748B]">date / text</td><td className="p-2 text-[#334155]">As-of date</td></tr>
                        <tr><td className="p-2 font-bold text-sky-700">last_updated</td><td className="p-2 text-[#64748B]">date / text</td><td className="p-2 text-[#334155]">Last updated date</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setShowSchemaGuide(false)}
                      className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 transition"
                    >
                      Close Guide
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

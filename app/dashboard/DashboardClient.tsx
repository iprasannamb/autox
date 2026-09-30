"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Plus, Sparkles, ArrowRight,
  Receipt, Wallet, Calculator, RefreshCw, Pencil, Trash2,
  Maximize2, RefreshCcw, Calendar, CheckCircle2, Clock,
} from "lucide-react";
import { useAppData } from "@/app/lib/hooks";
import { formatINR, formatINRCompact, futureValue } from "@/app/lib/finance";
import {
  CATEGORY_CONFIG, fmtDate, getExpenseFV, getMonthlyRecurringAmount,
  getDateContextLabel, DEFAULT_MONTHLY_BUDGET, todayISO, type NewExpense,
} from "@/app/lib/constants";
import type { Expense } from "@/app/lib/types";
import AppShell, { PageSkeleton } from "@/app/components/AppShell";
import ExpenseModal from "@/app/components/ExpenseModal";
import CategoryDetailModal, { type CategoryPeriod } from "@/app/components/CategoryDetailModal";
import type { WeeklyDigest } from "@/app/lib/ai-types";

// ── Reusable card ─────────────────────────────────────────────────────────────

function Card({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgb(15_23_42/0.04)] transition-shadow hover:shadow-[0_2px_8px_rgb(15_23_42/0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 shadow-lg text-xs">
      {label && <p className="mb-0.5 font-semibold text-[#0D1B2A]">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-sky-600">{formatINR(p.value)}</p>
      ))}
    </div>
  );
}

// ── Stat card component ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, trend, trendLabel, accent = false }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? "bg-sky-50" : "bg-[#F8FAFC]"}`}>
          <Icon size={18} className={accent ? "text-sky-500" : "text-[#8BA3B8]"} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            trend >= 0 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
          }`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-[#0D1B2A]">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-[#8BA3B8]">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-[#8BA3B8]">{sub}</p>}
      {trendLabel && <p className="mt-1 text-[11px] text-[#8BA3B8]">{trendLabel}</p>}
    </Card>
  );
}

// ── Main DashboardClient ──────────────────────────────────────────────────────

export default function DashboardClient() {
  const searchParams = useSearchParams();

  const {
    user,
    expenses,
    settings,
    loading,
    signOut,
    addExpense,
    updateExpense,
    deleteExpense,
    batchAddExpenses,
  } = useAppData();

  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);

  // Expense modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Category detail modal & period state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryPeriod, setCategoryPeriod] = useState<CategoryPeriod>("monthly");

  // Check query parameter for instant action
  useEffect(() => {
    if (searchParams?.get("action") === "add") {
      setEditingExpense(null);
      setShowExpenseModal(true);
    }
  }, [searchParams]);

  // ── Computed values ───────────────────────────────────────

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const total10yr = useMemo(() => expenses.reduce((s, e) => s + getExpenseFV(e, 10, 10), 0), [expenses]);

  const now = new Date();
  const thisMonthTotal = useMemo(() => {
    const m = now.getMonth(), y = now.getFullYear();
    return expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).reduce((s, e) => s + e.amount, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  const lastMonthTotal = useMemo(() => {
    let m = now.getMonth() - 1, y = now.getFullYear();
    if (m < 0) { m = 11; y--; }
    return expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).reduce((s, e) => s + e.amount, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  const monthDelta = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  // Monthly recurring commitments correctly scaled across daily, weekly, monthly, yearly
  const monthlyRecurring = useMemo(() =>
    expenses.reduce((s, e) => s + getMonthlyRecurringAmount(e), 0),
  [expenses]);

  const budgetUsed = Math.min(100, Math.round((thisMonthTotal / DEFAULT_MONTHLY_BUDGET) * 100));
  const savingsRate = DEFAULT_MONTHLY_BUDGET > 0 ? Math.max(0, Math.round(((DEFAULT_MONTHLY_BUDGET - thisMonthTotal) / DEFAULT_MONTHLY_BUDGET) * 100)) : 0;

  // ── Filtered By Category computation ─────────────────────

  const filteredCatExpenses = useMemo(() => {
    const today = todayISO();
    if (categoryPeriod === "daily") {
      return expenses.filter((e) => e.expense_date === today);
    }
    if (categoryPeriod === "weekly") {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      return expenses.filter((e) => new Date(e.expense_date) >= past7);
    }
    if (categoryPeriod === "monthly") {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 29);
      return expenses.filter((e) => new Date(e.expense_date) >= past30);
    }
    return expenses;
  }, [expenses, categoryPeriod]);

  const catPeriodTotal = useMemo(
    () => filteredCatExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredCatExpenses]
  );

  const catTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredCatExpenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCatExpenses]);

  const PIE_COLORS = catTotals.map((c) => CATEGORY_CONFIG[c.name]?.chart || "#64748b");

  // ── 7-Day Trend computation ──────────────────────────────

  const trendData = useMemo(() => {
    const days: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short" });
      const amount = expenses.filter((e) => e.expense_date === iso).reduce((s, e) => s + e.amount, 0);
      days.push({ day: dayLabel, amount });
    }
    return days;
  }, [expenses]);

  // ── Handlers for Add / Edit / Delete ──────────────────────

  const handleSaveExpense = useCallback(
    async (data: NewExpense, id?: string, extraOccurrences?: NewExpense[]) => {
      if (id) {
        await updateExpense(id, data);
      } else {
        await addExpense(data);
        if (extraOccurrences && extraOccurrences.length > 0) {
          await batchAddExpenses(extraOccurrences);
        }
      }
    },
    [addExpense, updateExpense, batchAddExpenses]
  );

  const handleDeleteExpense = useCallback(
    async (id: string) => {
      await deleteExpense(id);
    },
    [deleteExpense]
  );

  // ── Generate weekly digest ──────────────────────────────

  async function generateDigest() {
    if (digestLoading) return;
    setDigestLoading(true);
    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses }),
      });
      const data = (await res.json()) as WeeklyDigest;
      setDigest(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDigestLoading(false);
    }
  }

  // ── Loading state ──────────────────────────────────────

  if (loading) return <PageSkeleton />;

  return (
    <AppShell user={user} onSignOut={signOut}>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">

        {/* ── Page header ────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0D1B2A]">
              Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, {user?.name || "there"}
            </h1>
            <p className="mt-0.5 text-sm text-[#8BA3B8]">
              {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-dashboard-log-expense"
              onClick={() => {
                setEditingExpense(null);
                setShowExpenseModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_2px_8px_rgb(14_165_233/0.3)] transition hover:bg-sky-600 active:scale-[0.98]"
            >
              <Plus size={16} /> Log Expense
            </button>
            <Link
              href="/ai"
              className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#3D5A73] transition hover:border-sky-300 hover:text-sky-600"
            >
              <Sparkles size={16} /> Ask AI
            </Link>
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Spent this month"
            value={formatINR(thisMonthTotal)}
            icon={Receipt}
            trend={monthDelta}
            trendLabel={lastMonthTotal > 0 ? `vs ${formatINRCompact(lastMonthTotal)} last month` : undefined}
            accent
          />
          <StatCard
            label="Monthly budget used"
            value={`${budgetUsed}%`}
            icon={Wallet}
            sub={`${formatINRCompact(DEFAULT_MONTHLY_BUDGET - thisMonthTotal)} remaining of ${formatINRCompact(DEFAULT_MONTHLY_BUDGET)}`}
          />
          <StatCard
            label="True cost (10yr @ 10%)"
            value={formatINRCompact(total10yr)}
            icon={TrendingUp}
            sub={`Your ${formatINRCompact(totalSpent)} could grow ${totalSpent > 0 ? (total10yr / totalSpent).toFixed(1) : "0"}x`}
            accent
          />
          <StatCard
            label="Recurring commitments"
            value={formatINR(monthlyRecurring)}
            icon={Calculator}
            sub={`= ${formatINRCompact(futureValue(monthlyRecurring * 12, 0.12, 10))} in 10yr wealth`}
          />
        </div>

        {/* ── Charts row ─────────────────────────────────────── */}
        <div className="mb-6 grid gap-4 lg:grid-cols-5">
          {/* 7-day trend */}
          <Card className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#0D1B2A]">7-Day Spending</h2>
                <p className="text-xs text-[#8BA3B8]">Daily expenditure trend</p>
              </div>
              <span className="text-lg font-extrabold text-[#0D1B2A]">
                {formatINR(trendData.reduce((s, d) => s + d.amount, 0))}
              </span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#trendGrad)" dot={{ r: 3, fill: "#0ea5e9" }} activeDot={{ r: 5, fill: "#0D1B2A", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Enhanced By Category Card with Daily/Weekly/Monthly Filters ── */}
          <Card className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-[#0D1B2A]">By Category</h2>
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    title="Open detailed view"
                    className="rounded-lg p-1 text-[#8BA3B8] hover:bg-sky-50 hover:text-sky-600 transition"
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>

                {/* Period Filter Buttons: Daily / Weekly / Monthly / All */}
                <div className="flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-[10px]">
                  {(
                    [
                      { id: "daily", label: "Daily" },
                      { id: "weekly", label: "Weekly" },
                      { id: "monthly", label: "Monthly" },
                      { id: "all", label: "All" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryPeriod(p.id);
                      }}
                      className={`rounded-md px-2 py-0.5 font-bold transition ${
                        categoryPeriod === p.id
                          ? "bg-sky-500 text-white shadow-2xs"
                          : "text-[#64748B] hover:text-[#0D1B2A]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period spend subtitle */}
              <div className="mb-3 flex items-center justify-between text-xs border-b border-[#F1F5F9] pb-2">
                <span className="text-[#8BA3B8]">
                  {categoryPeriod === "daily"
                    ? "Today's spend"
                    : categoryPeriod === "weekly"
                    ? "Past 7 days"
                    : categoryPeriod === "monthly"
                    ? "Past 30 days"
                    : "Total tracked"}
                </span>
                <span className="font-extrabold text-[#0D1B2A]">{formatINR(catPeriodTotal)}</span>
              </div>

              {catTotals.length > 0 ? (
                <div
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center gap-4 cursor-pointer group"
                >
                  <div className="h-32 w-32 shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={catTotals}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={55}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {catTotals.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    {catTotals.slice(0, 4).map((c) => {
                      const cfg = CATEGORY_CONFIG[c.name] ?? CATEGORY_CONFIG.Other;
                      const pct = catPeriodTotal > 0 ? ((c.value / catPeriodTotal) * 100).toFixed(0) : "0";
                      return (
                        <div key={c.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.chart }} />
                            <span className="text-[#3D5A73] truncate">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <span className="text-[11px] text-[#8BA3B8]">{formatINRCompact(c.value)}</span>
                            <span className="font-bold text-[#0D1B2A]">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-[#8BA3B8]">
                  No expenses logged in this {categoryPeriod} window
                </p>
              )}
            </div>

            <button
              onClick={() => setShowCategoryModal(true)}
              className="mt-3 flex items-center justify-between text-xs font-semibold text-sky-600 hover:text-sky-700 pt-2 border-t border-[#F8FAFC]"
            >
              <span>Explore detailed breakdown</span>
              <ArrowRight size={11} />
            </button>
          </Card>
        </div>

        {/* ── Bottom row: Recent + AI Digest ──────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent expenses with Edit / Delete actions & Missed-day badge */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#0D1B2A]">Recent Expenses</h2>
                <p className="text-xs text-[#8BA3B8]">Log missed expenses, edit, or delete entries</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setShowExpenseModal(true);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600 hover:bg-sky-100 transition"
                >
                  <Plus size={12} /> Log Missed
                </button>
                <Link href="/expenses" className="text-xs font-semibold text-[#8BA3B8] hover:text-sky-600">
                  View all <ArrowRight size={10} className="ml-0.5 inline" />
                </Link>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="py-8 text-center">
                <Receipt size={24} className="mx-auto mb-2 text-[#CBD5E1]" />
                <p className="text-xs text-[#8BA3B8]">No expenses yet</p>
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setShowExpenseModal(true);
                  }}
                  className="mt-2 inline-block text-xs font-bold text-sky-600"
                >
                  + Log your first expense
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 5).map((e) => {
                  const cfg = CATEGORY_CONFIG[e.category] ?? CATEGORY_CONFIG.Other;
                  const Icon = cfg.icon;
                  const dateCtx = getDateContextLabel(e.expense_date);

                  return (
                    <div
                      key={e.id}
                      className="group flex items-center justify-between rounded-xl border border-[#F1F5F9] bg-[#FAFBFD] p-2.5 transition hover:border-[#E2E8F0] hover:bg-white"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                          <Icon size={14} style={{ color: cfg.color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-bold text-[#0D1B2A]">{e.description}</p>
                            {e.is_recurring && (
                              <span className="flex items-center gap-0.5 rounded-full bg-sky-50 px-1.5 py-0.2 text-[9px] font-bold text-sky-600 capitalize">
                                <RefreshCcw size={8} /> {e.recurring_frequency}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#8BA3B8]">
                            {fmtDate(e.expense_date)} · <span className={cfg.text}>{e.category}</span>
                            {dateCtx.isPast && dateCtx.daysAgo > 0 && (
                              <span className="ml-1 text-[9px] font-medium text-sky-600">
                                ({dateCtx.label})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-extrabold text-[#0D1B2A]">-{formatINR(e.amount)}</span>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition">
                          <Link
                            href={`/calculator?amount=${e.amount}`}
                            title="Model in Calculator"
                            className="rounded-lg p-1 text-[#94A3B8] hover:bg-sky-50 hover:text-sky-600"
                          >
                            <Calculator size={13} />
                          </Link>
                          <button
                            onClick={() => {
                              setEditingExpense(e);
                              setShowExpenseModal(true);
                            }}
                            title="Edit Expense"
                            className="rounded-lg p-1 text-[#94A3B8] hover:bg-sky-50 hover:text-sky-600"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            title="Delete Expense"
                            className="rounded-lg p-1 text-[#94A3B8] hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* AI Weekly Digest */}
          <Card className="flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                  <Sparkles size={16} className="text-sky-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0D1B2A]">AI Weekly Digest</h2>
                  <p className="text-[10px] text-[#8BA3B8]">Powered by Gemini</p>
                </div>
              </div>
              <button
                onClick={generateDigest}
                disabled={digestLoading}
                className="flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:opacity-50"
              >
                <RefreshCw size={12} className={digestLoading ? "animate-spin" : ""} />
                {digest ? "Refresh" : "Generate"}
              </button>
            </div>

            {digest ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex-1 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] p-3">
                  <div>
                    <p className="text-[10px] text-[#8BA3B8]">Week Total</p>
                    <p className="text-lg font-extrabold text-[#0D1B2A]">{formatINR(digest.totalSpent)}</p>
                  </div>
                  {digest.spendingChange !== null && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${digest.spendingChange > 0 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>
                      {digest.spendingChange > 0 ? "+" : ""}{digest.spendingChange}%
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {digest.insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-[#F8FAFC] p-2.5 text-xs text-[#334155]">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">{i + 1}</span>
                      <p className="leading-snug">{ins}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <Sparkles size={24} className="mb-2 text-[#CBD5E1]" />
                <p className="text-xs text-[#8BA3B8]">Click Generate to create an AI-powered weekly spending summary.</p>
              </div>
            )}

            <div className="mt-4 border-t border-[#F1F5F9] pt-3">
              <Link href="/ai" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700">
                Open full AI assistant <ArrowRight size={12} />
              </Link>
            </div>
          </Card>
        </div>

        {/* ── Budget progress bar ─────────────────────────────── */}
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-[#0D1B2A]">Monthly Budget</h2>
              <p className="text-xs text-[#8BA3B8]">{formatINRCompact(thisMonthTotal)} of {formatINRCompact(DEFAULT_MONTHLY_BUDGET)} spent</p>
            </div>
            <Link href="/budget" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
              Manage budgets <ArrowRight size={10} className="ml-0.5 inline" />
            </Link>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${budgetUsed}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                budgetUsed > 90 ? "bg-red-500" : budgetUsed > 75 ? "bg-amber-500" : "bg-sky-500"
              }`}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[#8BA3B8]">
            <span>Savings rate: {savingsRate}%</span>
            <span>{budgetUsed}% used</span>
          </div>
        </Card>

        <p className="mt-8 text-center text-[11px] text-[#94A3B8]">
          autoX Financial Engine — Opportunity cost projections assume reinvestment in broad market indices.
        </p>

        {/* ── Add / Edit Expense Modal ───────────────────────── */}
        <ExpenseModal
          isOpen={showExpenseModal}
          expense={editingExpense}
          onSave={handleSaveExpense}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
        />

        {/* ── Detailed Category View Modal ────────────────────── */}
        <CategoryDetailModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          expenses={expenses}
          period={categoryPeriod}
          onPeriodChange={setCategoryPeriod}
        />
      </div>
    </AppShell>
  );
}

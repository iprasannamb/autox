"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Wallet, AlertTriangle, CheckCircle2, TrendingUp, Pencil, Save,
  ArrowRight, PiggyBank,
} from "lucide-react";
import { useAppData } from "@/app/lib/hooks";
import { formatINR, formatINRCompact, futureValue } from "@/app/lib/finance";
import {
  CATEGORY_CONFIG, CATEGORIES, DEFAULT_BUDGETS, DEFAULT_MONTHLY_BUDGET,
} from "@/app/lib/constants";
import AppShell, { PageSkeleton } from "@/app/components/AppShell";

// ── Budget storage (localStorage) ─────────────────────────────────────────────

function loadBudgets(): { total: number; categories: Record<string, number> } {
  if (typeof window === "undefined") return { total: DEFAULT_MONTHLY_BUDGET, categories: { ...DEFAULT_BUDGETS } };
  try {
    const saved = localStorage.getItem("autox_budgets");
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { total: DEFAULT_MONTHLY_BUDGET, categories: { ...DEFAULT_BUDGETS } };
}

function saveBudgets(data: { total: number; categories: Record<string, number> }) {
  if (typeof window !== "undefined") {
    localStorage.setItem("autox_budgets", JSON.stringify(data));
  }
}

// ── Main BudgetClient ─────────────────────────────────────────────────────────

export default function BudgetClient() {
  const { user, expenses, loading, signOut } = useAppData();

  const [budgets, setBudgets] = useState(loadBudgets);
  const [editing, setEditing] = useState(false);
  const [editTotal, setEditTotal] = useState(String(budgets.total));
  const [editCats, setEditCats] = useState<Record<string, string>>({});

  // Sync initial edit state
  useEffect(() => {
    const cats: Record<string, string> = {};
    CATEGORIES.forEach((c) => {
      cats[c] = String(budgets.categories[c] ?? DEFAULT_BUDGETS[c] ?? 0);
    });
    setEditCats(cats);
    setEditTotal(String(budgets.total));
  }, [budgets]);

  // This month's spending per category
  const now = new Date();
  const thisMonthSpending = useMemo(() => {
    const m = now.getMonth(), y = now.getFullYear();
    const map: Record<string, number> = {};
    let total = 0;
    for (const e of expenses) {
      const d = new Date(e.expense_date);
      if (d.getMonth() === m && d.getFullYear() === y) {
        map[e.category] = (map[e.category] ?? 0) + e.amount;
        total += e.amount;
      }
    }
    return { categories: map, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  const overallPct = budgets.total > 0 ? Math.min(100, Math.round((thisMonthSpending.total / budgets.total) * 100)) : 0;
  const remaining = Math.max(0, budgets.total - thisMonthSpending.total);
  const isOverBudget = thisMonthSpending.total > budgets.total;
  const savingsRate = budgets.total > 0 ? Math.max(0, Math.round(((budgets.total - thisMonthSpending.total) / budgets.total) * 100)) : 0;

  // Breached categories
  const breachedCategories = CATEGORIES.filter((c) => {
    const limit = budgets.categories[c] ?? 0;
    const spent = thisMonthSpending.categories[c] ?? 0;
    return limit > 0 && spent > limit;
  });

  function handleSaveBudgets() {
    const total = parseInt(editTotal) || DEFAULT_MONTHLY_BUDGET;
    const categories: Record<string, number> = {};
    CATEGORIES.forEach((c) => {
      categories[c] = parseInt(editCats[c]) || 0;
    });
    const newBudgets = { total, categories };
    setBudgets(newBudgets);
    saveBudgets(newBudgets);
    setEditing(false);
  }

  if (loading) return <PageSkeleton />;

  return (
    <AppShell user={user} onSignOut={signOut}>
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0D1B2A]">Monthly Budget</h1>
            <p className="mt-0.5 text-sm text-[#8BA3B8]">
              {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} — Track spending against your limits
            </p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              editing
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "border border-[#E2E8F0] bg-white text-[#3D5A73] hover:border-sky-300 hover:text-sky-600"
            }`}
          >
            {editing ? <><Save size={16} /> Save Changes</> : <><Pencil size={16} /> Edit Budgets</>}
          </button>
        </div>

        {/* Overall budget card */}
        <div className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_rgb(15_23_42/0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isOverBudget ? "bg-red-50" : "bg-sky-50"}`}>
                <Wallet size={22} className={isOverBudget ? "text-red-500" : "text-sky-500"} />
              </div>
              <div>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#8BA3B8]">₹</span>
                    <input
                      type="number"
                      value={editTotal}
                      onChange={(e) => setEditTotal(e.target.value)}
                      className="w-36 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-lg font-bold text-[#0D1B2A] outline-none focus:border-sky-500"
                    />
                    <span className="text-sm text-[#8BA3B8]">/ month</span>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-extrabold text-[#0D1B2A]">{formatINR(budgets.total)}</p>
                    <p className="text-xs text-[#8BA3B8]">Monthly budget</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-extrabold text-[#0D1B2A]">{formatINRCompact(thisMonthSpending.total)}</p>
                <p className="text-[11px] text-[#8BA3B8]">Spent</p>
              </div>
              <div>
                <p className={`text-lg font-extrabold ${isOverBudget ? "text-red-500" : "text-emerald-600"}`}>
                  {formatINRCompact(remaining)}
                </p>
                <p className="text-[11px] text-[#8BA3B8]">Remaining</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-sky-600">{savingsRate}%</p>
                <p className="text-[11px] text-[#8BA3B8]">Savings rate</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(overallPct, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  overallPct > 90 ? "bg-red-500" : overallPct > 75 ? "bg-amber-500" : "bg-sky-500"
                }`}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-[#8BA3B8]">
              <span>{overallPct}% used</span>
              {isOverBudget && (
                <span className="flex items-center gap-1 font-semibold text-red-500">
                  <AlertTriangle size={11} /> Over budget by {formatINR(thisMonthSpending.total - budgets.total)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {breachedCategories.length > 0 && !editing && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-amber-900">Budget Alerts</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  {breachedCategories.length} {breachedCategories.length === 1 ? "category has" : "categories have"} exceeded their limit:{" "}
                  {breachedCategories.join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category budgets grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.Other;
            const Icon = cfg.icon;
            const limit = budgets.categories[cat] ?? 0;
            const spent = thisMonthSpending.categories[cat] ?? 0;
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            const isBreached = limit > 0 && spent > limit;
            const remaining = Math.max(0, limit - spent);
            const fvSaved = remaining > 0 ? futureValue(remaining, 0.12, 10) : 0;

            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border bg-white p-4 transition ${
                  isBreached ? "border-red-200 shadow-[0_0_0_1px_rgb(239_68_68/0.1)]" : "border-[#E2E8F0]"
                } hover:shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon size={16} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0D1B2A]">{cat}</p>
                      {editing ? (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-[11px] text-[#8BA3B8]">₹</span>
                          <input
                            type="number"
                            value={editCats[cat] ?? "0"}
                            onChange={(e) => setEditCats((prev) => ({ ...prev, [cat]: e.target.value }))}
                            onClick={handleSaveBudgets} // save on focus out
                            className="w-20 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-xs font-bold text-[#0D1B2A] outline-none focus:border-sky-500"
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#8BA3B8]">
                          {formatINRCompact(spent)} / {formatINRCompact(limit)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {isBreached ? (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-red-500">
                        <AlertTriangle size={11} /> +{formatINRCompact(spent - limit)}
                      </span>
                    ) : limit > 0 ? (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 size={11} /> {formatINRCompact(remaining)} left
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#CBD5E1]">No limit</span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {limit > 0 && !editing && (
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct > 90 ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-sky-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {remaining > 0 && (
                      <p className="mt-1 text-[10px] text-[#8BA3B8]">
                        Save & invest: {formatINRCompact(fvSaved)} in 10yr
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Savings opportunity card */}
        {!editing && remaining > 0 && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <PiggyBank size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">Savings Opportunity</p>
                <p className="mt-1 text-xs text-emerald-700">
                  You have <strong>{formatINR(remaining)}</strong> left in your budget this month.
                  If invested at 12% annually, this could grow to{" "}
                  <strong>{formatINRCompact(futureValue(remaining, 0.12, 10))}</strong> in 10 years.
                </p>
                <Link
                  href={`/calculator?amount=${remaining}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  See in Calculator <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {editing && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveBudgets}
              className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_2px_8px_rgb(14_165_233/0.3)] hover:bg-sky-600"
            >
              <Save size={16} /> Save All Budgets
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

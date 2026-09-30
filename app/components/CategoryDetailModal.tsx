"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  X,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  ArrowRight,
  TrendingUp,
  Receipt,
  Layers,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatINR, formatINRCompact } from "@/app/lib/finance";
import { CATEGORY_CONFIG, fmtDate } from "@/app/lib/constants";
import type { Expense } from "@/app/lib/types";

export type CategoryPeriod = "daily" | "weekly" | "monthly" | "all";

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  period: CategoryPeriod;
  onPeriodChange: (period: CategoryPeriod) => void;
}

export default function CategoryDetailModal({
  isOpen,
  onClose,
  expenses,
  period,
  onPeriodChange,
}: CategoryDetailModalProps) {
  // Filter expenses by period
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (period === "daily") {
      return expenses.filter((e) => e.expense_date === todayStr);
    }
    if (period === "weekly") {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      return expenses.filter((e) => new Date(e.expense_date) >= past7);
    }
    if (period === "monthly") {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 29);
      return expenses.filter((e) => new Date(e.expense_date) >= past30);
    }
    return expenses;
  }, [expenses, period]);

  const totalPeriodSpent = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );

  // Group by category with rich statistics
  const categoryStats = useMemo(() => {
    const map: Record<
      string,
      { total: number; count: number; items: { description: string; amount: number; date: string }[] }
    > = {};

    for (const e of filteredExpenses) {
      if (!map[e.category]) {
        map[e.category] = { total: 0, count: 0, items: [] };
      }
      map[e.category].total += e.amount;
      map[e.category].count += 1;
      map[e.category].items.push({
        description: e.description,
        amount: e.amount,
        date: e.expense_date,
      });
    }

    return Object.entries(map)
      .map(([name, stat]) => {
        const pct = totalPeriodSpent > 0 ? (stat.total / totalPeriodSpent) * 100 : 0;
        const avg = stat.count > 0 ? stat.total / stat.count : 0;
        const topItem = [...stat.items].sort((a, b) => b.amount - a.amount)[0];
        return {
          name,
          value: stat.total,
          count: stat.count,
          percentage: pct,
          average: avg,
          topItem,
          cfg: CATEGORY_CONFIG[name] ?? CATEGORY_CONFIG.Other,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, totalPeriodSpent]);

  const PIE_COLORS = categoryStats.map((c) => c.cfg.chart || "#0ea5e9");

  const periodDays = period === "daily" ? 1 : period === "weekly" ? 7 : period === "monthly" ? 30 : 90;
  const dailyAverage = totalPeriodSpent / periodDays;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-4xl rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#F1F5F9] pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <PieIcon size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#0D1B2A]">
                  Category Spending Breakdown
                </h2>
                <p className="text-xs text-[#8BA3B8]">
                  Detailed audit of your expenditure distribution across categories
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Period Filter Tabs */}
              <div className="flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 text-xs">
                {(
                  [
                    { id: "daily", label: "Daily" },
                    { id: "weekly", label: "Weekly" },
                    { id: "monthly", label: "Monthly" },
                    { id: "all", label: "All-Time" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPeriodChange(p.id)}
                    className={`rounded-lg px-3 py-1 font-bold transition ${
                      period === p.id
                        ? "bg-sky-500 text-white shadow-xs"
                        : "text-[#64748B] hover:text-[#0D1B2A]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8BA3B8] hover:bg-[#F0F4F8] hover:text-[#0D1B2A] transition ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Metric Summary Stat Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <p className="text-[11px] font-semibold text-[#8BA3B8]">Period Total</p>
              <p className="text-lg font-extrabold text-[#0D1B2A] mt-0.5">
                {formatINR(totalPeriodSpent)}
              </p>
              <p className="text-[10px] text-[#64748B] capitalize">{period} window</p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <p className="text-[11px] font-semibold text-[#8BA3B8]">Active Categories</p>
              <p className="text-lg font-extrabold text-sky-600 mt-0.5">
                {categoryStats.length}
              </p>
              <p className="text-[10px] text-[#64748B]">{filteredExpenses.length} total entries</p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <p className="text-[11px] font-semibold text-[#8BA3B8]">Daily Burn Rate</p>
              <p className="text-lg font-extrabold text-emerald-600 mt-0.5">
                {formatINR(dailyAverage)}
              </p>
              <p className="text-[10px] text-[#64748B]">Average / day</p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <p className="text-[11px] font-semibold text-[#8BA3B8]">Top Driver</p>
              <p className="text-sm font-extrabold text-[#0D1B2A] truncate mt-1">
                {categoryStats[0]?.name || "None"}
              </p>
              <p className="text-[10px] text-[#64748B]">
                {categoryStats[0] ? `${categoryStats[0].percentage.toFixed(0)}% of period` : "—"}
              </p>
            </div>
          </div>

          {categoryStats.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFD] py-14 text-center my-4">
              <Receipt size={32} className="mx-auto mb-2 text-[#CBD5E1]" />
              <p className="font-bold text-[#0D1B2A]">No expenses in this period</p>
              <p className="text-xs text-[#8BA3B8] mt-1">
                Try selecting &apos;Weekly&apos; or &apos;Monthly&apos; to view wider historical data.
              </p>
            </div>
          ) : (
            <>
              {/* Visualizations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Donut Chart with Legend */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFD] p-4">
                  <h3 className="text-xs font-bold text-[#0D1B2A] mb-2 flex items-center gap-1.5">
                    <PieIcon size={14} className="text-sky-600" />
                    Percentage Share
                  </h3>
                  <div className="flex items-center gap-4 h-52">
                    <div className="h-full w-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryStats}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {categoryStats.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: any) => [
                              formatINR(Number(val) || 0),
                              "Amount",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-48 space-y-1.5 pr-1">
                      {categoryStats.map((c) => (
                        <div key={c.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: c.cfg.chart }}
                            />
                            <span className="truncate text-[#334155]">{c.name}</span>
                          </div>
                          <span className="font-bold text-[#0D1B2A] ml-2">
                            {c.percentage.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Horizontal Comparison Bar Chart */}
                <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFD] p-4">
                  <h3 className="text-xs font-bold text-[#0D1B2A] mb-2 flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-sky-600" />
                    Amount Comparison (₹)
                  </h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryStats.slice(0, 6)}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: "#94A3B8" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => formatINRCompact(v)}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#334155" }}
                          axisLine={false}
                          tickLine={false}
                          width={75}
                        />
                        <Tooltip
                          formatter={(v: any) => [
                            formatINR(Number(v) || 0),
                            "Spent",
                          ]}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {categoryStats.slice(0, 6).map((c, i) => (
                            <Cell key={i} fill={c.cfg.chart || "#0ea5e9"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown List */}
              <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-[#64748B]">
                  <span>Category Details & Transactions</span>
                  <span>{categoryStats.length} Categories Active</span>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {categoryStats.map((c) => {
                    const Icon = c.cfg.icon;
                    return (
                      <div
                        key={c.name}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 hover:bg-[#FAFBFD] transition gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.cfg.bg}`}
                          >
                            <Icon size={16} style={{ color: c.cfg.color }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-xs text-[#0D1B2A]">{c.name}</p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-semibold text-slate-600">
                                {c.count} {c.count === 1 ? "entry" : "entries"}
                              </span>
                            </div>
                            {c.topItem && (
                              <p className="text-[10px] text-[#8BA3B8] truncate mt-0.5">
                                Largest: {c.topItem.description} ({formatINR(c.topItem.amount)}) on{" "}
                                {fmtDate(c.topItem.date)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 ml-12 sm:ml-0">
                          <div className="text-right">
                            <p className="text-xs font-extrabold text-[#0D1B2A]">
                              {formatINR(c.value)}
                            </p>
                            <p className="text-[10px] text-[#8BA3B8]">
                              {c.percentage.toFixed(1)}% · avg {formatINRCompact(c.average)}/txn
                            </p>
                          </div>

                          <Link
                            href={`/expenses?category=${encodeURIComponent(c.name)}`}
                            className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-[11px] font-bold text-sky-600 hover:bg-sky-50 hover:border-sky-300 transition"
                          >
                            View <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="mt-5 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-2xl border border-[#E2E8F0] bg-white px-5 py-2.5 text-xs font-bold text-[#334155] hover:bg-[#F8FAFC] transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WeeklyDigest } from "@/app/lib/ai-types";
import type { Expense } from "@/app/lib/types";
import { formatINR } from "@/app/lib/finance";

export default function WeeklyDigestCard({ expenses }: { expenses: Expense[] }) {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/digest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expenses }) });
      const data = await res.json() as WeeklyDigest & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed");
      setDigest(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-sm">📊</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Weekly AI Digest</h3>
            <p className="text-xs text-slate-400">{digest?.weekLabel ?? "AI-generated spending summary"}</p>
          </div>
        </div>
        <button id="btn-generate-digest" onClick={generate} disabled={loading || expenses.length === 0}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-40">
          {loading ? "Generating…" : digest ? "↻ Refresh" : "✨ Generate"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</div>}

      {loading && (
        <div className="animate-pulse space-y-3">
          {[70, 90, 60, 80].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-slate-100" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {digest && !loading && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs text-slate-400">Week Spent</p>
                <p className="text-2xl font-extrabold tracking-tight text-slate-900">{formatINR(digest.totalSpent)}</p>
              </div>
              {digest.spendingChange !== null && (
                <span className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${digest.spendingChange > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {digest.spendingChange > 0 ? "▲" : "▼"} {Math.abs(digest.spendingChange)}% vs last week
                </span>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Top Categories</p>
              <div className="flex gap-2">
                {digest.topCategories.map((c) => (
                  <div key={c.category} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                    <p className="text-lg">{c.icon}</p>
                    <p className="text-xs text-slate-500">{c.category}</p>
                    <p className="text-xs font-bold text-slate-900">{formatINR(c.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            {digest.unusualSpending && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                <p className="text-xs font-semibold text-amber-700">⚠ Unusual Spending</p>
                <p className="mt-0.5 text-xs text-slate-600">{digest.unusualSpending}</p>
              </div>
            )}

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
              <p className="text-xs font-semibold text-emerald-700">Savings Progress</p>
              <p className="mt-0.5 text-xs text-slate-600">{digest.savingsProgress}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">3 Key Insights</p>
              <div className="space-y-2">
                {digest.insights.map((ins, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <span className="shrink-0 text-xs font-extrabold text-indigo-500">{i + 1}</span>
                    <p className="text-xs text-slate-600">{ins}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!digest && !loading && !error && expenses.length === 0 && (
        <p className="text-center text-xs text-slate-400">Add some expenses first to generate your digest.</p>
      )}
    </div>
  );
}

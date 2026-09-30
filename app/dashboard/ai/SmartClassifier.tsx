"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ClassifiedExpense } from "@/app/lib/ai-types";
import { formatINR } from "@/app/lib/finance";

const CATEGORY_META: Record<string, { icon: string; bg: string; text: string }> = {
  Food:          { icon: "🍔", bg: "bg-orange-50",  text: "text-orange-600" },
  Transport:     { icon: "🚗", bg: "bg-sky-50",     text: "text-sky-600" },
  Shopping:      { icon: "🛍️", bg: "bg-pink-50",    text: "text-pink-600" },
  Entertainment: { icon: "🎬", bg: "bg-violet-50",  text: "text-violet-600" },
  Health:        { icon: "💊", bg: "bg-red-50",     text: "text-red-600" },
  Education:     { icon: "📚", bg: "bg-yellow-50",  text: "text-yellow-600" },
  Bills:         { icon: "💡", bg: "bg-cyan-50",    text: "text-cyan-600" },
  Travel:        { icon: "✈️", bg: "bg-emerald-50", text: "text-emerald-600" },
  Other:         { icon: "📦", bg: "bg-slate-100",  text: "text-slate-500" },
};

export default function SmartClassifier({ onAddExpenses }: { onAddExpenses?: (items: ClassifiedExpense[]) => void }) {
  const [text, setText]       = useState("");
  const [results, setResults] = useState<ClassifiedExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function classify() {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResults([]);
    try {
      const res = await fetch("/api/ai/classify-expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json() as { expenses?: ClassifiedExpense[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed");
      setResults(data.expenses ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  const total = results.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-sm">🤖</span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Smart Expense Classifier</h3>
          <p className="text-xs text-slate-400">Paste messy text — AI structures it</p>
        </div>
      </div>

      <textarea id="classifier-input" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Swiggy 450, Uber 230, Myntra 1999, Netflix 649"
        rows={3}
        className="mb-3 w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" />

      <button id="btn-classify" onClick={classify} disabled={loading || !text.trim()}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
        {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-white" />Classifying…</> : "✨ Classify with AI"}
      </button>

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</div>}

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="mb-3 space-y-1.5">
              {results.map((item, i) => {
                const meta = CATEGORY_META[item.category] ?? CATEGORY_META.Other;
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.18 }}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm ${meta.bg}`}>{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.item}</p>
                      <p className={`text-xs ${meta.text}`}>{item.category}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-900">{formatINR(item.amount)}</p>
                  </motion.div>
                );
              })}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50 px-3.5 py-2.5">
              <span className="text-xs text-indigo-600">{results.length} items · Total</span>
              <span className="font-bold text-indigo-700">{formatINR(total)}</span>
            </div>
            {onAddExpenses && (
              <button id="btn-add-classified" onClick={() => { onAddExpenses(results); setResults([]); setText(""); }}
                className="mt-2 w-full rounded-lg border border-indigo-200 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50">
                + Add All to Expenses
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WhatIfResponse } from "@/app/lib/ai-types";
import { formatINRCompact } from "@/app/lib/finance";

const EXAMPLES = [
  "What if I stop spending ₹200 daily on coffee?",
  "What if I skip eating out (₹500/day)?",
  "What if I cancel my ₹2000/month subscriptions?",
];

export default function WhatIfAnalyzer() {
  const [query, setQuery]   = useState("");
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function analyze() {
    if (!query.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/ai/whatif", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const data = await res.json() as WhatIfResponse & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sm">🔮</span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">What-If Analyzer</h3>
          <p className="text-xs text-slate-400">Natural language habit projections</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => setQuery(ex)}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600">
            {ex.replace("What if I ", "")}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input id="whatif-input" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="What if I stop spending ₹200 daily on coffee?"
          className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" />
        <button id="btn-whatif-analyze" onClick={analyze} disabled={loading || !query.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
          {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-white inline-block" /> : "Analyze"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</div>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-4 space-y-3">
            <div className="rounded-lg border border-sky-100 bg-sky-50 p-3.5">
              <p className="text-xs font-semibold text-sky-600">Parsed Habit</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">{result.parsed.habit}</p>
              <p className="text-xs text-slate-500">₹{result.parsed.dailyAmount}/day · ₹{(result.parsed.dailyAmount * 365).toLocaleString("en-IN")}/year saved</p>
              <p className="mt-1 text-xs italic text-slate-400">{result.parsed.explanation}</p>
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">If Invested Instead</p>
            {result.projections.map((p, i) => (
              <motion.div key={p.rate} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: p.color }}>{p.label} ({p.rate}%)</span>
                  <span className="text-xs text-slate-400">₹{p.annualSavings.toLocaleString("en-IN")}/yr saved</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[{ yr: 5, val: p.fv5yr }, { yr: 10, val: p.fv10yr }, { yr: 20, val: p.fv20yr }].map(({ yr, val }) => (
                    <div key={yr} className="rounded-md bg-white p-2 border border-slate-200">
                      <p className="text-xs text-slate-400">{yr} yr</p>
                      <p className="text-sm font-bold text-slate-900">{formatINRCompact(val)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

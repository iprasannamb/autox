"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ClassifiedExpense, AIQuota } from "@/app/lib/ai-types";
import { formatINR } from "@/app/lib/finance";
import AIQuotaBadge from "@/app/components/AIQuotaBadge";
import { Sparkles, Info } from "lucide-react";

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
  const [notice, setNotice]   = useState<string | null>(null);
  const [quota, setQuota]     = useState<AIQuota | null>(null);

  useEffect(() => {
    fetch("/api/ai/quota")
      .then((res) => res.json())
      .then((data) => {
        if (data?.quota) setQuota(data.quota);
      })
      .catch(() => {});
  }, []);

  async function classify() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    setResults([]);

    try {
      const res = await fetch("/api/ai/classify-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as {
        expenses?: ClassifiedExpense[];
        quota?: AIQuota;
        error?: string;
        notice?: string;
      };

      if (data.quota) setQuota(data.quota);
      if (data.notice) setNotice(data.notice);

      if (data.expenses && data.expenses.length > 0) {
        setResults(data.expenses);
      } else if (data.error) {
        setError(data.error);
      } else {
        setError("Could not identify specific expenses. Try: 'Swiggy 450, Uber 230, Myntra 1999'");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const total = results.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_0_rgb(15_23_42/0.05)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 text-sm">
            <Sparkles size={16} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#0D1B2A]">Smart Expense Classifier</h3>
            <p className="text-xs text-[#8BA3B8]">Paste messy text — AI structures it</p>
          </div>
        </div>

        {/* Quota Badge */}
        <AIQuotaBadge quota={quota} compact />
      </div>

      <textarea
        id="classifier-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Swiggy 450, Uber 230, Myntra 1999, Netflix 649"
        rows={3}
        className="mb-3 w-full resize-none rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          id="btn-classify"
          onClick={classify}
          disabled={loading || !text.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_0_rgb(14_165_233/0.25)] transition hover:bg-sky-600 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-white" />
              Classifying…
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Classify with AI
            </>
          )}
        </button>

        {text && (
          <button
            onClick={() => {
              setText("");
              setResults([]);
              setError(null);
              setNotice(null);
            }}
            className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {notice && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs text-sky-800">
          <Info size={14} className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
          {error}
        </div>
      )}

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="mb-3 space-y-1.5">
              {results.map((item, i) => {
                const meta = CATEGORY_META[item.category] ?? CATEGORY_META.Other;
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.18 }}
                    className="flex items-center gap-3 rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] px-3 py-2.5">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${meta.bg}`}>{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0D1B2A]">{item.item}</p>
                      <p className={`text-xs ${meta.text}`}>{item.category}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-[#0D1B2A]">{formatINR(item.amount)}</p>
                  </motion.div>
                );
              })}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-2.5">
              <span className="text-xs font-medium text-sky-700">{results.length} items detected</span>
              <span className="font-bold text-sky-900">{formatINR(total)}</span>
            </div>
            {onAddExpenses && (
              <button
                id="btn-add-classified"
                onClick={() => { onAddExpenses(results); setResults([]); setText(""); }}
                className="mt-2.5 w-full rounded-xl border border-sky-300 bg-sky-50 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                + Add All to Expenses Tracker
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

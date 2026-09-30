"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  MessageSquare,
  CheckCircle2,
  Send,
  Zap,
} from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  prompt: string;
  monthlySavings: string;
  corpus5y: string;
  corpus10y: string;
  corpus20y: string;
  aiVerdict: string;
  tag: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "coffee",
    name: "☕ The ₹200 Daily Coffee",
    prompt: "What if I cut down buying ₹200 coffee every work day and brew at home?",
    monthlySavings: "₹4,400 / mo",
    corpus5y: "₹3.62 Lakhs",
    corpus10y: "₹10.21 Lakhs",
    corpus20y: "₹43.95 Lakhs",
    aiVerdict:
      "Redirecting ₹4,400/month into a diversified index fund generates ₹10.21 Lakhs in 10 years. That’s enough to fund a full international masters program or 2 years of rent.",
    tag: "High Micro-Leakage",
  },
  {
    id: "food",
    name: "🛵 Weekend Delivery (₹3,500/wk)",
    prompt: "What if I reduce weekend food deliveries from 4 times to 1 time per week?",
    monthlySavings: "₹10,500 / mo",
    corpus5y: "₹8.64 Lakhs",
    corpus10y: "₹24.36 Lakhs",
    corpus20y: "₹1.05 Crores",
    aiVerdict:
      "A modest reduction in weekend ordering frees up ₹10,500/month. At a conservative 12% equity CAGR, you accumulate ₹1.05 Crores over 20 years — true financial independence capital.",
    tag: "Massive Compounder",
  },
  {
    id: "gadget",
    name: "📱 Annual Phone Upgrade (₹80k)",
    prompt: "What happens if I upgrade my smartphone every 3 years instead of every year?",
    monthlySavings: "₹4,444 / mo",
    corpus5y: "₹3.66 Lakhs",
    corpus10y: "₹10.31 Lakhs",
    corpus20y: "₹44.40 Lakhs",
    aiVerdict:
      "Skipping two upgrade cycles preserves ₹1.6 Lakhs of principal, which silently compounds into over ₹10 Lakhs of liquid equity.",
    tag: "Lifestyle Inflation",
  },
];

export function InteractiveAIDemo() {
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [customInput, setCustomInput] = useState("");
  const [customResult, setCustomResult] = useState<string | null>(null);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    // Parse amount from text if any
    const numbers = customInput.match(/\d+/g);
    const amount = numbers ? parseInt(numbers.join(""), 10) : 5000;
    const tenYear = Math.round(amount * 3.1058);

    setCustomResult(
      `Analyzing: ₹${amount.toLocaleString("en-IN")}. If redirected into an equity SIP at 12% CAGR, this amount compounds to ₹${tenYear.toLocaleString("en-IN")} over 10 years — a 3.1× wealth multiplier!`
    );
  };

  return (
    <section id="ai-engine" className="relative border-y border-[var(--border)] bg-[var(--surface-muted)]/40 py-20 sm:py-32 overflow-hidden">
      {/* Glow Backdrop */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-sky-500/10 blur-[120px] dark:bg-sky-500/15"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <Sparkles strokeWidth={1.5} className="h-3.5 w-3.5" />
            <span>Dedicated AI Showcase</span>
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-[var(--text-primary)]">
            Meet autoX AI: <br className="hidden sm:inline" />
            The Wealth Intelligence Engine
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)]">
            Trained on opportunity cost models and Indian market return benchmarks. Ask questions in plain English, and watch your future balance sheet unfold.
          </p>
        </div>

        {/* Interactive Workspace Box */}
        <div className="mt-14 mx-auto max-w-4xl overflow-hidden rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl">
          {/* Top Bar with Scenario Tabs */}
          <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Brain strokeWidth={1.5} className="h-4 w-4 text-sky-500" />
                Select a Real-World Scenario:
              </span>
              <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                Live Interactive Demo
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveScenario(s);
                    setCustomResult(null);
                  }}
                  className={`rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    activeScenario.id === s.id && !customResult
                      ? "bg-sky-600 text-white shadow-sm"
                      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chat / Evaluation Display */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* User Prompt Bubble */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs">
                YOU
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                {customResult ? customInput : activeScenario.prompt}
              </div>
            </div>

            {/* AI Response Card */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-md">
                <Sparkles strokeWidth={1.5} className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-4 rounded-2xl rounded-tl-sm border border-sky-500/25 bg-gradient-to-br from-sky-500/5 via-[var(--surface-elevated)] to-[var(--surface-elevated)] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                      autoX AI Analysis
                    </span>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {activeScenario.tag}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] font-mono">12% CAGR Benchmark</span>
                </div>

                {/* 3 Metric Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase">
                      5-Year Corpus
                    </span>
                    <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
                      {activeScenario.corpus5y}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
                    <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase">
                      10-Year Corpus (Prime)
                    </span>
                    <p className="mt-1 text-xl font-black text-sky-600 dark:text-sky-400">
                      {activeScenario.corpus10y}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase">
                      20-Year Horizon
                    </span>
                    <p className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {activeScenario.corpus20y}
                    </p>
                  </div>
                </div>

                {/* Verdict text */}
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {customResult || activeScenario.aiVerdict}
                </p>

                <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
                  <CheckCircle2 strokeWidth={1.5} className="h-4 w-4 text-emerald-500" />
                  Calculated against diversified Indian equity mutual funds.
                </div>
              </div>
            </div>

            {/* Custom Interactive Prompt Input */}
            <form onSubmit={handleCustomSubmit} className="relative mt-4">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Try asking: 'What if I save ₹3,000 every month on shopping?'"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] py-3.5 pl-4 pr-28 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 shadow-sm"
              >
                <span>Ask AI</span>
                <Send strokeWidth={1.5} className="h-3 w-3" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Receipt,
  Sparkles,
  Bell,
  Command,
  ArrowUpRight,
  TrendingUp,
  Check,
  Search,
  Sliders,
  DollarSign,
  PieChart,
} from "lucide-react";

export function BentoGrid() {
  const [selectedRate, setSelectedRate] = useState<8 | 12 | 15>(12);

  const rateProjections = {
    8: { corpus: "₹18.4 Lakhs", gain: "+₹6.4L", note: "Debt / Fixed Income benchmark" },
    12: { corpus: "₹23.2 Lakhs", gain: "+₹11.2L", note: "Diversified Nifty 50 equity CAGR" },
    15: { corpus: "₹27.8 Lakhs", gain: "+₹15.8L", note: "Aggressive flexi-cap equity" },
  };

  return (
    <section id="features" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
            Intelligent Feature Architecture
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-[var(--text-primary)]">
            Everything you need.<br />
            Nothing you don’t.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[var(--text-secondary)]">
            Every feature in autoX is engineered to give you extreme clarity over your capital and compound your net worth.
          </p>
        </div>

        {/* 12-Column Asymmetric Bento Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Opportunity Cost Calculator (Span 7) */}
          <div className="md:col-span-7 group relative flex flex-col justify-between overflow-hidden rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs transition-all duration-300 hover:border-sky-500/30 hover:shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Calculator strokeWidth={1.5} className="h-6 w-6" />
                </div>
                <Link
                  href="/calculator"
                  className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Open Full Calculator <ArrowUpRight strokeWidth={1.5} className="h-3.5 w-3.5" />
                </Link>
              </div>

              <h3 className="mt-5 text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Opportunity Cost Calculator
              </h3>
              <p className="mt-2 text-sm sm:text-base text-[var(--text-secondary)]">
                Enter any spend amount. Compare Conservative, Moderate, and Aggressive returns across 5, 10, and 20 years.
              </p>
            </div>

            {/* Interactive Real UI Visual inside Card */}
            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div className="text-xs text-[var(--text-muted)] font-mono">
                  INPUT: ₹10,000 / month SIP (10 Years)
                </div>
                <div className="flex items-center gap-1.5">
                  {([8, 12, 15] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRate(r)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        selectedRate === r
                          ? "bg-sky-500 text-white shadow-xs"
                          : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                    Projected 10-Year Corpus
                  </p>
                  <p className="text-3xl font-black text-sky-600 dark:text-sky-400">
                    {rateProjections[selectedRate].corpus}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp strokeWidth={1.5} className="h-3.5 w-3.5" />
                    {rateProjections[selectedRate].gain} Pure Gain
                  </span>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {rateProjections[selectedRate].note}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: AI Expense Classifier (Span 5) */}
          <div className="md:col-span-5 group relative flex flex-col justify-between overflow-hidden rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs transition-all duration-300 hover:border-sky-500/30 hover:shadow-lg">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Receipt strokeWidth={1.5} className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Smart Expense Classifier
              </h3>
              <p className="mt-2 text-sm sm:text-base text-[var(--text-secondary)]">
                Paste messy bank alerts or raw UPI notes. AI auto-categorizes and calculates future wealth impact.
              </p>
            </div>

            {/* Real UI Mockup */}
            <div className="mt-6 space-y-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5">
              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)]">Swiggy Delivery</span>
                  <span className="rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                    Food & Dining
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[var(--text-primary)]">₹540</span>
                  <span className="block text-[10px] text-sky-500">→ ₹1,680 in 10y</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)]">Uber Premier</span>
                  <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    Commute
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[var(--text-primary)]">₹420</span>
                  <span className="block text-[10px] text-sky-500">→ ₹1,306 in 10y</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)]">Netflix Premium</span>
                  <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                    Sub
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[var(--text-primary)]">₹649/mo</span>
                  <span className="block text-[10px] text-sky-500">→ ₹1.5L in 10y</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Instant What-If Simulation (Span 4) */}
          <div className="md:col-span-4 group relative flex flex-col justify-between overflow-hidden rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-sky-500/30 hover:shadow-lg">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles strokeWidth={1.5} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                What-If Analyzer
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                Ask counterfactuals like “What if I cut dining out by 30%?” and see exact portfolio projections.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-xs">
              <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-700 dark:text-sky-300 font-medium">
                “What if I skip ₹200/day cafe coffee?”
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                <span className="text-[var(--text-muted)]">5-Yr Impact:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+₹4.8 Lakhs</span>
              </div>
            </div>
          </div>

          {/* Card 4: Actionable Wealth Alerts (Span 4) */}
          <div className="md:col-span-4 group relative flex flex-col justify-between overflow-hidden rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-sky-500/30 hover:shadow-lg">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Bell strokeWidth={1.5} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                Actionable Wealth Alerts
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                Real-time warnings when impulse spikes and automatic nudges to sweep idle cash into your SIPs.
              </p>
            </div>

            <div className="mt-6 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs">
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 p-2 text-red-700 dark:text-red-300">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                <div>
                  <p className="font-semibold text-[11px]">Impulse Spike Detected</p>
                  <p className="text-[10px] text-red-600/80 dark:text-red-300/80">
                    Shopping is 42% above your monthly ceiling.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <p className="font-semibold text-[11px]">Surplus Cash Available</p>
                  <p className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80">
                    ₹6,000 unallocated → +₹18,600 in 10y SIP.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Command Palette & Shortcuts (Span 4) */}
          <div className="md:col-span-4 group relative flex flex-col justify-between overflow-hidden rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-sky-500/30 hover:shadow-lg">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Command strokeWidth={1.5} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                Command Palette & Speed
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                Fast keyboard navigation. Press Ctrl+K on Windows or Cmd+K on Mac to log or calculate in seconds.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-[var(--text-muted)]">
                <Search strokeWidth={1.5} className="h-3.5 w-3.5" />
                <span className="text-[11px]">Type command or amount...</span>
                <span className="ml-auto rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[9px]">
                  Ctrl+K
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="rounded-lg px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] flex justify-between">
                  <span>Log ₹450 Swiggy</span>
                  <span className="text-sky-500">Quick Log</span>
                </div>
                <div className="rounded-lg px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] flex justify-between">
                  <span>Calculate ₹25,000</span>
                  <span className="text-sky-500">Scenario</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

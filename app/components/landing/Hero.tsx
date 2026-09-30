"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Calculator,
  Receipt,
  Layers,
  Clock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export function Hero() {
  const [horizon, setHorizon] = useState<"5y" | "10y" | "20y">("10y");

  const horizonData = {
    "5y": {
      multiplier: "1.76×",
      compoundedValue: "₹74,800",
      gain: "+₹32,300",
      swiggyCost: "₹1,144",
      gadgetCost: "₹1,40,624",
      cagr: "12% CAGR",
    },
    "10y": {
      multiplier: "3.11×",
      compoundedValue: "₹1,32,175",
      gain: "+₹89,675",
      swiggyCost: "₹2,018",
      gadgetCost: "₹2,48,490",
      cagr: "12% CAGR",
    },
    "20y": {
      multiplier: "9.65×",
      compoundedValue: "₹4,10,125",
      gain: "+₹3,67,625",
      swiggyCost: "₹6,272",
      gadgetCost: "₹7,71,035",
      cagr: "12% CAGR",
    },
  };

  const currentData = horizonData[horizon];

  return (
    <section className="relative isolate overflow-hidden pt-8 pb-20 sm:pt-16 sm:pb-32">
      {/* Background Radial Glow (inspired by joincobalt.com) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(85%_55%_at_50%_-15%,rgba(14,165,233,0.22),rgba(255,255,255,0))] dark:bg-[radial-gradient(85%_55%_at_50%_-15%,rgba(56,189,248,0.28),rgba(0,0,0,0))]"
        aria-hidden="true"
      />

      {/* Grid Pattern Overlay */}
      <svg
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full stroke-slate-400/10 dark:stroke-white/5 [mask-image:radial-gradient(75%_50%_at_top_center,white,transparent)]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="hero-grid"
            width="60"
            height="60"
            x="50%"
            y="-1"
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 60V.5H60" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth="0" fill="url(#hero-grid)" />
      </svg>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header copy */}
        <div className="mx-auto max-w-3xl text-center">
          {/* Tag Pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-sky-600 dark:text-sky-400">
              Wealth Intelligence for India
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]">
            <span className="text-[var(--text-primary)]">Turn impulse spending into </span>
            <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-600 bg-clip-text text-transparent">
              lifetime wealth.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl leading-relaxed text-[var(--text-secondary)]">
            Every rupee you spend has an opportunity cost. autoX calculates what your daily
            purchases could become if invested instead — so you can make choices your future self
            will thank you for.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              id="hero-cta-primary"
              href="/signup"
              className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-2xl p-[1px] text-base font-semibold shadow-lg shadow-sky-500/20 transition-all duration-300 hover:shadow-sky-500/35 hover:scale-[1.02]"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500 animate-starlight-right" />
              <div className="relative inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-3.5 text-white transition-colors group-hover:bg-sky-500">
                <span>Start for free</span>
                <ArrowRight strokeWidth={1.5} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              id="hero-cta-secondary"
              href="/calculator"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-7 py-3.5 text-base font-semibold text-[var(--text-primary)] shadow-xs transition-all hover:bg-[var(--surface-muted)] hover:border-[var(--border-hover)]"
            >
              <Calculator strokeWidth={1.5} className="h-4 w-4 text-[var(--accent)]" />
              <span>Try Live Calculator</span>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 strokeWidth={1.5} className="h-4 w-4 text-emerald-500" />
              Free forever plan
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 strokeWidth={1.5} className="h-4 w-4 text-emerald-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck strokeWidth={1.5} className="h-4 w-4 text-sky-500" />
              Bank-grade encrypted & private
            </span>
          </div>
        </div>

        {/* Hero Product UI Mockup (Depth, Starlight beams, Interactive UI) */}
        <div className="relative mt-14 sm:mt-20">
          {/* Top Starlight Beam (joincobalt.com signature) */}
          <div className="absolute -top-px right-12 md:right-28 h-2 w-32 md:w-64 [mask-image:linear-gradient(to_right,transparent_0%,#d9d9d9_25%,#d9d9d9_75%,transparent_100%)] overflow-hidden z-20">
            <div className="h-px w-full animate-starlight-right bg-gradient-to-r from-cyan-400/0 via-cyan-400 to-cyan-400/0" />
          </div>

          {/* Bottom Starlight Beam */}
          <div className="absolute -bottom-2 left-12 md:left-28 h-2 w-32 md:w-64 [mask-image:linear-gradient(to_right,transparent_0%,#d9d9d9_25%,#d9d9d9_75%,transparent_100%)] overflow-hidden z-20">
            <div className="h-px w-full animate-starlight-left bg-gradient-to-r from-cyan-400/0 via-cyan-400 to-cyan-400/0" />
          </div>

          {/* Mockup Card Frame */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_70px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {/* Mockup Browser/App Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--border)] pb-4 mb-6 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-secondary)] font-mono">
                  <span>autox.finance/dashboard</span>
                </div>
              </div>

              {/* Time Horizon Selector (Interactive) */}
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1 text-xs font-semibold">
                <span className="px-2 text-[var(--text-muted)] flex items-center gap-1">
                  <Clock strokeWidth={1.5} className="h-3.5 w-3.5" />
                  Horizon:
                </span>
                {(["5y", "10y", "20y"] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                      horizon === h
                        ? "bg-sky-500 text-white shadow-xs font-bold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {h === "5y" ? "5 Years" : h === "10y" ? "10 Years" : "20 Years"}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Stat Summary Column (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Stat 1: Spending */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-5 shadow-xs">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Tracked Monthly Spending
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                    ₹42,500
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <Receipt strokeWidth={1.5} className="h-3.5 w-3.5 text-sky-500" />
                    28 transactions categorized
                  </p>
                </div>

                {/* Stat 2: Opportunity Cost Result */}
                <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      If Invested Instead ({horizon})
                    </p>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {currentData.multiplier}
                    </span>
                  </div>
                  <p className="mt-1 text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400">
                    {currentData.compoundedValue}
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingUp strokeWidth={1.5} className="h-3.5 w-3.5" />
                    {currentData.gain} surplus wealth generated (@ 12%)
                  </p>
                </div>

                {/* Quick Insight Pill */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--text-primary)]">Insight: </span>
                  Redirecting just 20% of discretionary spending gives you an extra{" "}
                  <strong className="text-sky-500">{horizon === "20y" ? "₹82,000" : "₹26,400"}</strong>{" "}
                  per year in compounding equity.
                </div>
              </div>

              {/* Chart & Live Activity Column (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* SVG Curve Chart */}
                <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">
                        Compounding Trajectory vs Flat Consumption
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        Equity Growth (12% CAGR) vs Constant ₹0 Residual Value
                      </p>
                    </div>
                    <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                      12% CAGR Baseline
                    </span>
                  </div>

                  {/* SVG Chart Visualization */}
                  <div className="relative h-44 w-full">
                    <svg
                      viewBox="0 0 500 160"
                      className="h-full w-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="0" y1="40" x2="500" y2="40" stroke="currentColor" className="text-[var(--border)]" strokeDasharray="3 3" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="currentColor" className="text-[var(--border)]" strokeDasharray="3 3" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-[var(--border)]" strokeDasharray="3 3" />

                      {/* Area Fill */}
                      <path
                        d="M 0 140 Q 150 125, 300 75 T 500 20 L 500 150 L 0 150 Z"
                        fill="url(#chartGradient)"
                      />

                      {/* Spend Line (Flat Zero future value) */}
                      <path
                        d="M 0 145 L 500 145"
                        stroke="#EF4444"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Compounding Curve */}
                      <path
                        d="M 0 140 Q 150 125, 300 75 T 500 20"
                        fill="none"
                        stroke="#0EA5E9"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      {/* Glowing marker points */}
                      <circle cx="150" cy="125" r="4" fill="#0EA5E9" className="animate-pulse" />
                      <circle cx="300" cy="75" r="5" fill="#38BDF8" />
                      <circle cx="500" cy="20" r="6" fill="#38BDF8" className="shadow-lg" />
                    </svg>

                    {/* Annotation Pill */}
                    <div className="absolute top-2 right-4 rounded-xl border border-sky-500/30 bg-[var(--surface)] px-3 py-1.5 shadow-md">
                      <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                        {currentData.compoundedValue} Future Corpus
                      </p>
                    </div>

                    <div className="absolute bottom-1 left-2 text-[10px] text-red-500 font-medium">
                      Spend Value: ₹0 in 10y
                    </div>
                  </div>
                </div>

                {/* Real Transaction Tags Feed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs">
                        FD
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">Swiggy Gourmet</p>
                        <p className="text-[11px] text-[var(--text-muted)]">₹650 spent</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
                        {currentData.swiggyCost}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">Future cost</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs">
                        TECH
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">iPhone 16 Pro</p>
                        <p className="text-[11px] text-[var(--text-muted)]">₹79,900 spent</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-sky-600 dark:text-sky-400">
                        {currentData.gadgetCost}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">Future cost</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingUp, XCircle, CheckCircle2 } from "lucide-react";

export function StorySection() {
  return (
    <section id="story" className="relative border-y border-[var(--border)] bg-[var(--surface-muted)]/50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 2-Column Cobalt-style Editorial Statement */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-16">
          {/* Left Column: Bold Headline */}
          <div className="lg:col-span-5">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              The Reality of Compounding
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl leading-[1.12] text-[var(--text-primary)]">
              Why let impulse buys silently drain your future?
            </h2>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-1 w-12 rounded-full bg-sky-500" />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                The ₹5,000 Paradox
              </span>
            </div>
          </div>

          {/* Right Column: Confident, Playful Copy */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <p className="text-lg sm:text-xl leading-relaxed text-[var(--text-secondary)]">
              Modern apps in India are masterfully engineered to make you click{" "}
              <strong className="text-[var(--text-primary)]">“Order Now”</strong> in three seconds flat.
              Delivery takes 10 minutes, but the hidden cost compounds for decades.
            </p>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
              That ₹5,000 weekend splurge isn’t just ₹5,000. Invested in an index fund at 12% CAGR,
              it compounds to <span className="font-semibold text-sky-600 dark:text-sky-400">₹15,529 in 10 years</span> and{" "}
              <span className="font-semibold text-sky-600 dark:text-sky-400">₹48,230 in 20 years</span>.
            </p>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
              autoX doesn’t tell you to live like a monk. We simply make the hidden trade-offs visible
              in real-time — so you spend intentionally and grow effortlessly.
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison Cards */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: Buy Now */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-red-500/20 bg-[var(--surface)] p-6 sm:p-8 shadow-xs transition-all hover:border-red-500/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                  <XCircle strokeWidth={1.5} className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">The Impulse Buy</h3>
                  <p className="text-xs text-[var(--text-muted)]">Immediate dopamine, zero residue</p>
                </div>
              </div>
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                Consumption
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Instant satisfaction that fades within days
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                ₹5,000 spent today yields ₹0 future value
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Subconscious cycle repeated 20-30 times every month
              </li>
            </ul>

            <div className="mt-8 border-t border-[var(--border)] pt-4 flex items-baseline justify-between">
              <span className="text-xs text-[var(--text-muted)]">Value in 10 Years:</span>
              <span className="text-2xl font-black text-red-600 dark:text-red-400">₹0</span>
            </div>
          </div>

          {/* Card 2: Invest Instead */}
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[var(--surface)] to-[var(--surface)] p-6 sm:p-8 shadow-xs transition-all hover:border-emerald-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp strokeWidth={1.5} className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">The Invested Future</h3>
                  <p className="text-xs text-[var(--text-muted)]">Compounding equity in diversified funds</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                3.1× Wealth Multiplier
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex items-center gap-2">
                <CheckCircle2 strokeWidth={1.5} className="h-4 w-4 text-emerald-500" />
                ₹5,000 becomes ₹15,529 in 10y and ₹48,230 in 20y
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 strokeWidth={1.5} className="h-4 w-4 text-emerald-500" />
                Silently accumulates while you sleep
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 strokeWidth={1.5} className="h-4 w-4 text-emerald-500" />
                Builds genuine financial independence and security
              </li>
            </ul>

            <div className="mt-8 border-t border-[var(--border)] pt-4 flex items-baseline justify-between">
              <span className="text-xs text-[var(--text-muted)]">Value in 10 Years (@ 12%):</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹15,529
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

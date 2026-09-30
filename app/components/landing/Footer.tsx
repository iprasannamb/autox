"use client";

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-muted)]/40 py-16 text-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-md">
                <span className="text-sm font-black text-white">X</span>
              </div>
              <span className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                auto<span className="text-sky-500">X</span>
              </span>
            </Link>

            <p className="max-w-sm text-sm text-[var(--text-secondary)] leading-relaxed">
              autoX empowers ambitious earners in India to calculate the real opportunity cost of every purchase and redirect mindless spending into compounding wealth.
            </p>

            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All systems operational · Live in India 🇮🇳</span>
            </div>
          </div>

          {/* Links Column 1: Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Product
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
              <li>
                <Link href="/calculator" className="hover:text-[var(--text-primary)] transition">
                  Opportunity Cost Calculator
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition">
                  Expense Dashboard
                </Link>
              </li>
              <li>
                <Link href="/budget" className="hover:text-[var(--text-primary)] transition">
                  Monthly Budgeting
                </Link>
              </li>
              <li>
                <Link href="/investments" className="hover:text-[var(--text-primary)] transition">
                  Investment Goals
                </Link>
              </li>
              <li>
                <Link href="/ai" className="hover:text-[var(--text-primary)] transition">
                  AI Money Coach
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Architecture */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Architecture
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
              <li>
                <Link href="#features" className="hover:text-[var(--text-primary)] transition">
                  What-If Analyzer
                </Link>
              </li>
              <li>
                <Link href="#ai-engine" className="hover:text-[var(--text-primary)] transition">
                  AI Classifier
                </Link>
              </li>
              <li>
                <span className="text-[var(--text-muted)]">Supabase Row-Level Security</span>
              </li>
              <li>
                <span className="text-[var(--text-muted)]">Zero Third-Party Ad Trackers</span>
              </li>
              <li>
                <span className="text-[var(--text-muted)]">INR Formatting Engine</span>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Trust & Preferences */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Theme & Preferences
            </h4>
            <div className="mt-4 flex items-center gap-3">
              <ThemeToggle />
              <span className="text-xs text-[var(--text-muted)]">Toggle Light/Dark</span>
            </div>

            <div className="mt-6 space-y-2 text-xs text-[var(--text-muted)]">
              <p>Sign In: <Link href="/signin" className="text-sky-500 hover:underline">Account Access</Link></p>
              <p>Register: <Link href="/signup" className="text-sky-500 hover:underline">Free Account</Link></p>
            </div>
          </div>
        </div>

        {/* Bottom Bar & Disclaimer */}
        <div className="mt-14 border-t border-[var(--border)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <p>© {currentYear} autoX Technologies. All rights reserved. Stop buying, start growing.</p>
          <p className="max-w-md text-center sm:text-right">
            Disclaimer: Projections are illustrative models based on historical CAGR benchmarks (e.g. 12% equity CAGR) and not guaranteed returns.
          </p>
        </div>
      </div>
    </footer>
  );
}

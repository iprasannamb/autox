"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Calculator, CheckCircle2, ShieldCheck } from "lucide-react";

export function FinalCTA() {
  return (
    <section id="cta" className="relative py-20 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl md:rounded-[40px] border border-sky-500/25 bg-gradient-to-b from-sky-500/10 via-[var(--surface)] to-[var(--surface)] p-8 sm:p-16 lg:p-20 text-center shadow-2xl">
          {/* Radial Light Glow */}
          <div
            className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-sky-500/20 blur-[100px]"
            aria-hidden="true"
          />

          {/* Starlight beams on top edge */}
          <div className="absolute -top-px left-1/4 h-2 w-1/2 [mask-image:linear-gradient(to_right,transparent_0%,#d9d9d9_25%,#d9d9d9_75%,transparent_100%)] overflow-hidden">
            <div className="h-px w-full animate-starlight-right bg-gradient-to-r from-cyan-400/0 via-cyan-400 to-cyan-400/0" />
          </div>

          <div className="relative mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
              Financial Foresight
            </span>

            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl text-[var(--text-primary)] leading-[1.1]">
              Your money should build your future,{" "}
              <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-600 bg-clip-text text-transparent">
                not just your cart.
              </span>
            </h2>

            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
              Join thousands of disciplined spenders and future-focused investors across India.
              Discover the true opportunity cost of your daily life.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                id="final-cta-primary"
                href="/signup"
                className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-2xl bg-sky-600 px-9 py-4 text-base font-semibold text-white shadow-xl shadow-sky-500/25 transition-all duration-300 hover:bg-sky-500 hover:scale-[1.02]"
              >
                <span>Get Started for Free</span>
                <ArrowRight strokeWidth={1.5} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                id="final-cta-secondary"
                href="/calculator"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-8 py-4 text-base font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
              >
                <Calculator strokeWidth={1.5} className="h-4 w-4 text-sky-500" />
                <span>Try Live Calculator</span>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 strokeWidth={1.5} className="h-4 w-4 text-emerald-500" />
                100% Free Forever
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 strokeWidth={1.5} className="h-4 w-4 text-emerald-500" />
                30-Second Onboarding
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck strokeWidth={1.5} className="h-4 w-4 text-sky-500" />
                Private & Secure RLS
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

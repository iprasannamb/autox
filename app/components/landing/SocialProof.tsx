"use client";

import React from "react";
import { ShieldCheck, Lock, Star, CheckCircle, TrendingUp, Sparkles } from "lucide-react";

export function SocialProof() {
  const stats = [
    {
      value: "₹15,529",
      label: "What ₹5,000 becomes in 10 yrs",
      sub: "12% historical equity CAGR benchmark",
    },
    {
      value: "3.1×",
      label: "Decade Wealth Multiplier",
      sub: "Silent compounding without speculation",
    },
    {
      value: "100%",
      label: "Zero-Knowledge Data Privacy",
      sub: "Row-Level Security on Supabase",
    },
    {
      value: "0 Ads",
      label: "Completely Unbiased Guidance",
      sub: "No sponsored credit cards or loan pitches",
    },
  ];

  const testimonials = [
    {
      quote:
        "autoX is the first finance app that genuinely cured my mindless spending. Seeing that a ₹6,000 impulse buy is literally ₹18,600 of future wealth taken away from my 30s stopped my late-night ordering instantly.",
      author: "Aarav Sharma",
      role: "Senior Staff Engineer, Bengaluru",
      avatar: "AS",
      metric: "Reclaimed ₹18,500 / month",
    },
    {
      quote:
        "Normal budgeting apps tell you where your money went after you lost it. autoX gives you foresight BEFORE you pull the trigger. It has completely transformed how our family prioritizes capital.",
      author: "Priyanshi Mehta",
      role: "Product Lead, Mumbai",
      avatar: "PM",
      metric: "Increased SIP by 40%",
    },
    {
      quote:
        "The AI What-If simulator is scary accurate. I tested skipping 2 gadget upgrades and found ₹8.4 Lakhs in future compounding equity. That realization alone paid for itself a hundred times over.",
      author: "Rohit Kulkarni",
      role: "Founder & Architect, Hyderabad",
      avatar: "RK",
      metric: "Tracked ₹4.2L opportunity cost",
    },
  ];

  const ecosystem = [
    "Zerodha",
    "Groww",
    "HDFC Bank",
    "ICICI",
    "UPI Instant",
    "Swiggy",
    "Zomato",
    "Cred",
  ];

  return (
    <section id="proof" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Key Stats Bar */}
        <div className="rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
            {stats.map((s, idx) => (
              <div
                key={s.label}
                className={`${idx === 0 ? "" : "pt-6 sm:pt-0 sm:pl-8"} text-center sm:text-left`}
              >
                <p className="text-3xl sm:text-4xl font-black text-sky-600 dark:text-sky-400">
                  {s.value}
                </p>
                <p className="mt-1.5 text-sm font-bold text-[var(--text-primary)]">{s.label}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ecosystem Logos / Compatibility strip */}
        <div className="mt-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Seamlessly works with India’s leading financial & consumer ecosystems
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {ecosystem.map((name) => (
              <div
                key={name}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-sky-500/30 hover:text-[var(--text-primary)]"
              >
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="mt-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Loved by ambitious earners and smart investors
            </h3>
            <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)]">
              Join thousands who stopped mindless consumption and started compounding real freedom.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="flex flex-col justify-between rounded-2xl md:rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-xs transition-all duration-300 hover:border-sky-500/30 hover:shadow-md"
              >
                <div>
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-amber-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} strokeWidth={1.5} className="h-4 w-4 fill-amber-500" />
                    ))}
                  </div>

                  <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
                    “{t.quote}”
                  </p>
                </div>

                <div className="mt-8 border-t border-[var(--border)] pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{t.author}</p>
                      <p className="text-xs text-[var(--text-muted)]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

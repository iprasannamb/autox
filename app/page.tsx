import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "autoX — Stop Buying, Start Growing",
  description: "autoX shows the real cost of every purchase — what that money could become if invested instead. Built for smarter financial decisions.",
};

// ── Icon primitives ───────────────────────────────────────────────────────────

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 7h10M8 3l4 4-4 4" />
    </svg>
  );
}

// ── Static data (real features from codebase) ─────────────────────────────────

const FEATURES = [
  {
    icon: "📊",
    title: "Opportunity Cost Calculator",
    description: "Enter any amount. Instantly see what it grows into at 8%, 12%, and 15% annual returns over 5, 10, and 20 years.",
    href: "/calculator",
  },
  {
    icon: "📋",
    title: "Expense Tracking",
    description: "Log and categorize your expenses. Auto-detects categories from descriptions — Swiggy, Uber, Netflix and more.",
    href: "/dashboard",
  },
  {
    icon: "📈",
    title: "Portfolio Projections",
    description: "See how your entire tracked spending could compound into wealth if invested across all your chosen return scenarios.",
    href: "/dashboard",
  },
  {
    icon: "🤖",
    title: "AI Expense Classifier",
    description: "Paste messy text like 'Swiggy 450, Uber 230, Myntra 1999' and AI structures it into clean expense records instantly.",
    href: "/dashboard",
  },
  {
    icon: "🔮",
    title: "What-If Analyzer",
    description: "Ask 'What if I stop spending ₹200/day on coffee?' and see the exact investment projections across three scenarios.",
    href: "/dashboard",
  },
  {
    icon: "💬",
    title: "AI Money Coach",
    description: "A context-aware AI chat that uses your actual expense data to give specific, numbers-based financial guidance.",
    href: "/dashboard",
  },
];

const STATS = [
  { value: "₹15,529", label: "₹5,000 invested for 10 years at 12%" },
  { value: "3×", label: "Typical 10-year equity return multiple" },
  { value: "100%", label: "Private — your data stays yours" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-xs font-extrabold text-white">X</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">auto<span className="text-sky-600">X</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/signin" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              Sign In
            </Link>
            <Link
              id="nav-get-started"
              href="/signup"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
          <span className="text-sm font-medium text-sky-700">Smart money decisions for India</span>
        </div>

        <h1 className="mx-auto mb-6 max-w-3xl text-5xl font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-6xl">
          Every rupee you spend<br />
          <span className="text-sky-600">has an opportunity cost.</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg text-slate-500">
          autoX shows you what your spending could become if invested instead —
          so you can make choices you won't regret in 10 years.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            id="hero-cta-primary"
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_2px_8px_0_rgb(79_70_229/0.35)] transition hover:bg-sky-700 hover:shadow-[0_4px_12px_0_rgb(79_70_229/0.4)]"
          >
            Start for free <ArrowRight />
          </Link>
          <Link
            id="hero-cta-secondary"
            href="/calculator"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Try the calculator
          </Link>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-xs text-slate-400">Free · No card required · Data encrypted at rest</p>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.value}>
                <p className="text-3xl font-extrabold text-slate-900">{s.value}</p>
                <p className="mt-1 text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE ₹5,000 EXAMPLE ── */}
      <section id="example" className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">The ₹5,000 question</h2>
          <p className="text-slate-500">That impulse purchase feels fine today. But what does it actually cost you?</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { id: "example-1y", horizon: "1 year",  value: "₹5,600",  ring: false, accent: false },
            { id: "example-5y", horizon: "5 years", value: "₹8,811",  ring: true,  accent: true },
            { id: "example-10y", horizon: "10 years",value: "₹15,529", ring: false, accent: false },
          ].map((ex) => (
            <div
              key={ex.id}
              id={ex.id}
              className={`rounded-2xl border p-7 text-center ${
                ex.accent
                  ? "border-sky-200 bg-sky-50 ring-2 ring-sky-500 ring-offset-2"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className={`mb-2 text-xs font-semibold uppercase tracking-widest ${ex.accent ? "text-sky-500" : "text-slate-400"}`}>
                In {ex.horizon}
              </p>
              <p className={`text-4xl font-extrabold ${ex.accent ? "text-sky-700" : "text-slate-900"}`}>{ex.value}</p>
              <p className={`mt-2 text-xs ${ex.accent ? "text-sky-500" : "text-slate-400"}`}>at 12% annual return</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          ₹5,000 invested today at 12% CAGR — typical of diversified equity mutual funds.
        </p>
      </section>

      {/* ── BUY vs INVEST ── */}
      <section id="comparison" className="border-y border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">Buy now vs invest</h2>
            <p className="text-slate-500">Two choices. Very different outcomes.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div id="card-buy" className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-base">🛍️</span>
                <h3 className="font-bold text-slate-900">Buy Now</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {["Instant satisfaction, fades quickly", "₹5,000 spent → ₹0 future value", "Often forgotten within weeks", "Keeps you in the cycle"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-0.5 text-red-400">✕</span>{t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-2xl font-extrabold text-red-600">₹0 <span className="text-sm font-normal text-slate-400">in 10 years</span></p>
            </div>
            <div id="card-invest" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-base">📈</span>
                <h3 className="font-bold text-slate-900">Invest Instead</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                {["Delayed reward, lasting wealth", "₹5,000 invested → ₹15,529 in 10 years", "Compounds silently in the background", "Builds financial independence"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-600">✓</span>{t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-2xl font-extrabold text-emerald-700">₹15,529 <span className="text-sm font-normal text-slate-500">in 10 years</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">Everything you need</h2>
          <p className="text-slate-500">Built to give you honest, data-driven financial clarity.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-sky-200 hover:shadow-[0_4px_6px_-1px_rgb(15_23_42/0.07)]"
            >
              <div className="mb-4 text-2xl">{f.icon}</div>
              <h3 className="mb-2 font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{f.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PRIVACY / TRUST ── */}
      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            {[
              { icon: "🔒", title: "Row-Level Security", desc: "Your data is isolated by Supabase RLS — no one else can see your records." },
              { icon: "🚫", title: "No Data Selling", desc: "We don't sell, share or monetize your financial data. Ever." },
              { icon: "🇮🇳", title: "Built for India", desc: "INR formatting, Indian numbering system, relevant benchmarks." },
            ].map((t) => (
              <div key={t.title}>
                <div className="mb-3 text-2xl">{t.icon}</div>
                <h3 className="mb-1.5 font-bold text-slate-900">{t.title}</h3>
                <p className="text-sm text-slate-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="py-24 text-center">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900">Start making smarter choices</h2>
          <p className="mb-8 text-slate-500">Free to use. No credit card. Takes 30 seconds to set up.</p>
          <Link
            id="cta-get-started"
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-10 py-4 text-base font-semibold text-white shadow-[0_2px_8px_0_rgb(79_70_229/0.35)] transition hover:bg-sky-700"
          >
            Get started free <ArrowRight />
          </Link>
          <p className="mt-4 text-xs text-slate-400">Already have an account? <Link href="/signin" className="text-sky-600 hover:underline">Sign in</Link></p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-xs text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} autoX — Think before you spend.</span>
          <span>⚠️ All projections are illustrative, not guaranteed returns.</span>
        </div>
      </footer>
    </div>
  );
}

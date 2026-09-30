export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-slate-900">
            auto<span className="text-indigo-600">X</span>
          </span>
          <a
            id="nav-cta"
            href="#calculator"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Try Calculator →
          </a>
        </nav>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <span className="mb-6 inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
          Smart money decisions, simplified
        </span>
        <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl">
          Stop buying.{" "}
          <span className="text-indigo-600">Start growing.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-500">
          autoX reveals the hidden opportunity cost of every purchase. Before
          you spend ₹5,000 on something you might not need, see what that money
          could become if you invested it instead.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            id="hero-cta-primary"
            href="#calculator"
            className="rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg"
          >
            Start the Calculator
          </a>
          <a
            id="hero-cta-secondary"
            href="#comparison"
            className="rounded-xl border border-slate-200 px-8 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* ── THE ₹5,000 EXAMPLE ──────────────────────────────── */}
      <section
        id="example"
        className="border-y border-slate-100 bg-slate-50 py-20"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              The ₹5,000 question
            </h2>
            <p className="text-slate-500">
              That impulse buy feels fine now. But what does it really cost
              you?
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Year 1 */}
            <div
              id="example-1y"
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
            >
              <p className="mb-1 text-sm font-medium uppercase tracking-widest text-slate-400">
                In 1 year
              </p>
              <p className="text-4xl font-extrabold text-slate-900">₹5,600</p>
              <p className="mt-2 text-sm text-slate-500">
                at 12% annual return
              </p>
            </div>

            {/* Year 5 */}
            <div
              id="example-5y"
              className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-center shadow-sm ring-2 ring-indigo-500 ring-offset-2"
            >
              <p className="mb-1 text-sm font-medium uppercase tracking-widest text-indigo-500">
                In 5 years
              </p>
              <p className="text-4xl font-extrabold text-indigo-700">₹8,811</p>
              <p className="mt-2 text-sm text-indigo-500">
                at 12% annual return
              </p>
            </div>

            {/* Year 10 */}
            <div
              id="example-10y"
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
            >
              <p className="mb-1 text-sm font-medium uppercase tracking-widest text-slate-400">
                In 10 years
              </p>
              <p className="text-4xl font-extrabold text-slate-900">₹15,529</p>
              <p className="mt-2 text-sm text-slate-500">
                at 12% annual return
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-400">
            ₹5,000 invested today at a modest 12% CAGR — typical of diversified
            equity mutual funds in India.
          </p>
        </div>
      </section>

      {/* ── BUY NOW vs INVEST COMPARISON ────────────────────── */}
      <section id="comparison" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              Buy Now vs Invest
            </h2>
            <p className="text-slate-500">
              Two paths. Very different destinations.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Buy Now card */}
            <div
              id="card-buy"
              className="rounded-2xl border border-red-100 bg-red-50 p-8"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xl">
                  🛍️
                </span>
                <h3 className="text-xl font-bold text-red-700">Buy Now</h3>
              </div>
              <ul className="space-y-3 text-sm text-red-800">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-red-400">✕</span>
                  Instant gratification, fades quickly
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-red-400">✕</span>
                  ₹5,000 spent → ₹0 in future value
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-red-400">✕</span>
                  Often forgotten within weeks
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-red-400">✕</span>
                  Keeps you on the paycheck-to-paycheck cycle
                </li>
              </ul>
              <p className="mt-6 text-2xl font-extrabold text-red-700">
                ₹0 <span className="text-sm font-normal">in 10 years</span>
              </p>
            </div>

            {/* Invest card */}
            <div
              id="card-invest"
              className="rounded-2xl border border-green-100 bg-green-50 p-8"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl">
                  📈
                </span>
                <h3 className="text-xl font-bold text-green-700">Invest</h3>
              </div>
              <ul className="space-y-3 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">✓</span>
                  Delayed reward, lasting wealth
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">✓</span>
                  ₹5,000 invested → ₹15,529 in 10 years
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">✓</span>
                  Compounds silently in the background
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">✓</span>
                  Builds financial independence over time
                </li>
              </ul>
              <p className="mt-6 text-2xl font-extrabold text-green-700">
                ₹15,529{" "}
                <span className="text-sm font-normal">in 10 years</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── KEY FEATURES ────────────────────────────────────── */}
      <section
        id="features"
        className="border-y border-slate-100 bg-slate-50 py-20"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              What autoX does
            </h2>
            <p className="text-slate-500">
              A no-fluff tool built for honest financial clarity.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div
              id="feature-opportunity"
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="mb-4 text-3xl">💸</div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">
                Opportunity Cost
              </h3>
              <p className="text-sm text-slate-500">
                Enter any amount and instantly see its future value if invested
                — at rates you choose.
              </p>
            </div>

            <div
              id="feature-comparison"
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="mb-4 text-3xl">⚖️</div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">
                Side-by-Side View
              </h3>
              <p className="text-sm text-slate-500">
                A clear Buy vs Invest breakdown so you can make informed
                decisions without second-guessing.
              </p>
            </div>

            <div
              id="feature-simple"
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="mb-4 text-3xl">🎯</div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">
                Simple & Fast
              </h3>
              <p className="text-sm text-slate-500">
                No sign-ups, no subscriptions. Just type in a number and get
                your answer immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section
        id="calculator"
        className="py-24 text-center"
      >
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-4 text-4xl font-extrabold text-slate-900">
            Ready to see your number?
          </h2>
          <p className="mb-8 text-lg text-slate-500">
            Enter any amount and discover the true cost of spending vs
            investing. It only takes 10 seconds.
          </p>
          <a
            id="cta-calculator"
            href="/calculator"
            className="inline-block rounded-xl bg-indigo-600 px-10 py-5 text-lg font-semibold text-white shadow-lg transition hover:bg-indigo-700 hover:shadow-xl"
          >
            Open the Calculator →
          </a>
          <p className="mt-4 text-sm text-slate-400">
            Free. No login required.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <p>
          © {new Date().getFullYear()} autoX — Built to help you think twice
          before you spend.
        </p>
      </footer>
    </div>
  );
}

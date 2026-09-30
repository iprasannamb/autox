"use client";

import { useState } from "react";
import {
  Chart,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import {
  SCENARIOS,
  formatINR,
  formatINRCompact,
  futureValue,
  growthMultiple,
  growthSeries,
} from "../lib/finance";

// ── Register Chart.js modules once ───────────────────────────────────────────
Chart.register(
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

// ── Constants ─────────────────────────────────────────────────────────────────
const HORIZONS = [5, 10, 20] as const;
type Horizon = (typeof HORIZONS)[number];

const DISCLAIMER =
  "Illustrative projections, not guaranteed returns. Past performance does not predict future results.";

// ── Dark chart theme defaults ─────────────────────────────────────────────────
const CHART_FONT = {
  family: "Inter, ui-sans-serif, system-ui, sans-serif",
  size: 12,
};

const GRID_COLOR = "rgba(255,255,255,0.06)";
const TICK_COLOR = "#94a3b8";

const tooltipDefaults = {
  backgroundColor: "#1e293b",
  borderColor: "#334155",
  borderWidth: 1,
  titleColor: "#f1f5f9",
  bodyColor: "#94a3b8",
  padding: 12,
  cornerRadius: 8,
  callbacks: {
    label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
      ` ${ctx.dataset.label}: ${formatINRCompact(ctx.parsed.y)}`,
  },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </p>
  );
}

function Card({
  id,
  children,
  accent,
}: {
  id?: string;
  children: React.ReactNode;
  accent?: "indigo" | "emerald" | "red";
}) {
  const ring =
    accent === "indigo"
      ? "ring-1 ring-indigo-500/30"
      : accent === "emerald"
        ? "ring-1 ring-emerald-500/30"
        : accent === "red"
          ? "ring-1 ring-red-500/30"
          : "ring-1 ring-white/5";
  return (
    <div
      id={id}
      className={`rounded-2xl bg-slate-800/60 p-6 backdrop-blur-sm ${ring}`}
    >
      {children}
    </div>
  );
}

// ── Main Calculator Component ─────────────────────────────────────────────────

export default function CalculatorClient() {
  const [amount, setAmount] = useState<number>(50000);
  const [rawInput, setRawInput] = useState<string>("50000");
  const [horizon, setHorizon] = useState<Horizon>(10);

  // Derived values
  const moderate = SCENARIOS.find((s) => s.label === "Moderate")!;
  const moderateFV = futureValue(amount, moderate.rate, horizon);

  // ── Input handling ──────────────────────────────────────────────────────────
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    setRawInput(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) setAmount(parsed);
  }

  // ── Line chart data ─────────────────────────────────────────────────────────
  const lineLabels = Array.from({ length: 20 }, (_, i) => `Yr ${i + 1}`);

  const lineData: ChartData<"line"> = {
    labels: lineLabels,
    datasets: SCENARIOS.map((s) => ({
      label: `${s.label} (${(s.rate * 100).toFixed(0)}%)`,
      data: growthSeries(amount, s.rate, 20),
      borderColor: s.color,
      backgroundColor: `${s.color}18`,
      fill: false,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2,
    })),
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          color: TICK_COLOR,
          font: CHART_FONT,
          boxWidth: 12,
          boxHeight: 2,
          usePointStyle: false,
        },
      },
      tooltip: tooltipDefaults,
    },
    scales: {
      x: {
        ticks: { color: TICK_COLOR, font: CHART_FONT, maxTicksLimit: 10 },
        grid: { color: GRID_COLOR },
        border: { color: GRID_COLOR },
      },
      y: {
        ticks: {
          color: TICK_COLOR,
          font: CHART_FONT,
          callback: (v) => formatINRCompact(Number(v)),
        },
        grid: { color: GRID_COLOR },
        border: { color: GRID_COLOR },
      },
    },
  };

  // ── Bar chart data ──────────────────────────────────────────────────────────
  const barData: ChartData<"bar"> = {
    labels: SCENARIOS.map(
      (s) => `${s.label}\n${(s.rate * 100).toFixed(0)}%`
    ),
    datasets: [
      {
        label: "Future Value",
        data: SCENARIOS.map((s) => futureValue(amount, s.rate, horizon)),
        backgroundColor: SCENARIOS.map((s) => `${s.color}cc`),
        borderColor: SCENARIOS.map((s) => s.color),
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipDefaults,
    },
    scales: {
      x: {
        ticks: { color: TICK_COLOR, font: CHART_FONT },
        grid: { display: false },
        border: { color: GRID_COLOR },
      },
      y: {
        ticks: {
          color: TICK_COLOR,
          font: CHART_FONT,
          callback: (v) => formatINRCompact(Number(v)),
        },
        grid: { color: GRID_COLOR },
        border: { color: GRID_COLOR },
      },
    },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-900/90 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-bold tracking-tight">
            auto<span className="text-indigo-400">X</span>
          </a>
          <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300">
            Calculator
          </span>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        {/* ── PAGE TITLE ── */}
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Buy Now vs Invest
          </h1>
          <p className="text-slate-400">
            Enter any amount to see its opportunity cost across three investment
            scenarios.
          </p>
        </div>

        {/* ── INPUTS ── */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end">
          {/* Amount input */}
          <div className="flex-1">
            <SectionLabel>Amount (₹)</SectionLabel>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg font-medium text-slate-400">
                ₹
              </span>
              <input
                id="input-amount"
                type="text"
                inputMode="numeric"
                value={rawInput}
                onChange={handleAmountChange}
                className="w-full rounded-xl border border-white/10 bg-slate-800 py-3 pl-9 pr-4 text-lg font-semibold text-white outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                placeholder="50000"
              />
            </div>
          </div>

          {/* Time-horizon chips */}
          <div>
            <SectionLabel>Time Horizon</SectionLabel>
            <div id="horizon-chips" className="mt-1 flex gap-2">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  id={`chip-${h}yr`}
                  onClick={() => setHorizon(h)}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    horizon === h
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "border border-white/10 bg-slate-800 text-slate-400 hover:border-indigo-500/50 hover:text-slate-200"
                  }`}
                >
                  {h} yr
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── BUY NOW vs INVEST COMPARISON CARDS ── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Buy Now */}
          <Card id="card-buy-now" accent="red">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-lg">
                🛍️
              </span>
              <span className="text-sm font-semibold text-red-400 uppercase tracking-widest">
                Buy Now
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white">
              {formatINR(amount)}
            </p>
            <p className="mt-1 text-sm text-slate-400">spent today</p>
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-sm text-slate-500">
                After {horizon} years: spent money delivers{" "}
                <span className="font-semibold text-red-400">₹0</span> in
                financial return.
              </p>
            </div>
          </Card>

          {/* Invest */}
          <Card id="card-invest" accent="emerald">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-lg">
                📈
              </span>
              <span className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">
                Invest — Moderate (12%)
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white">
              {formatINR(moderateFV)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              in {horizon} years at 12% p.a.
            </p>
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-sm text-slate-500">
                Growth:{" "}
                <span className="font-semibold text-emerald-400">
                  {growthMultiple(amount, moderateFV)}
                </span>{" "}
                your money over {horizon} years.
              </p>
            </div>
          </Card>
        </div>

        {/* ── SCENARIO SUMMARY CARDS ── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {SCENARIOS.map((s) => {
            const fv = futureValue(amount, s.rate, horizon);
            const gain = fv - amount;
            return (
              <Card key={s.label} id={`scenario-${s.label.toLowerCase()}`}>
                <div
                  className="mb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: s.color }}
                >
                  {s.label} — {(s.rate * 100).toFixed(0)}%
                </div>
                <p className="text-2xl font-extrabold text-white">
                  {formatINR(fv)}
                </p>
                <p className="mt-0.5 text-sm text-slate-400">
                  in {horizon} yr
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Gain:{" "}
                  <span className="font-medium text-slate-300">
                    {formatINR(gain)}
                  </span>{" "}
                  · {growthMultiple(amount, fv)}
                </p>
              </Card>
            );
          })}
        </div>

        {/* ── LINE CHART ── */}
        <Card id="chart-growth-line">
          <h2 className="mb-1 text-base font-bold text-white">
            Growth Over 20 Years
          </h2>
          <p className="mb-5 text-xs text-slate-500">
            How{" "}
            <span className="text-slate-300 font-medium">
              {formatINR(amount)}
            </span>{" "}
            compounds across all three scenarios
          </p>
          <div className="h-64 sm:h-80">
            <Line data={lineData} options={lineOptions} />
          </div>
        </Card>

        {/* ── BAR CHART ── */}
        <div className="mt-6">
          <Card id="chart-scenario-bar">
            <h2 className="mb-1 text-base font-bold text-white">
              Scenario Comparison at {horizon} Years
            </h2>
            <p className="mb-5 text-xs text-slate-500">
              Final value of{" "}
              <span className="text-slate-300 font-medium">
                {formatINR(amount)}
              </span>{" "}
              in each scenario
            </p>
            <div className="h-56 sm:h-72">
              <Bar data={barData} options={barOptions} />
            </div>
          </Card>
        </div>

        {/* ── DISCLAIMER ── */}
        <p
          id="disclaimer"
          className="mt-8 text-center text-xs leading-relaxed text-slate-600"
        >
          ⚠️ {DISCLAIMER}
        </p>
      </main>
    </div>
  );
}

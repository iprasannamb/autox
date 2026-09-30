"use client";

import { useState } from "react";
import {
  Chart, LineElement, BarElement, CategoryScale, LinearScale,
  PointElement, Tooltip, Legend, Filler, type ChartOptions, type ChartData,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { SCENARIOS, formatINR, formatINRCompact, futureValue, growthMultiple, growthSeries } from "../lib/finance";
import AppShell from "@/app/components/AppShell";

Chart.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const HORIZONS = [5, 10, 20] as const;
type Horizon = (typeof HORIZONS)[number];

const FONT = { family: "Inter, ui-sans-serif, system-ui", size: 11 };
const GRID = "rgba(15,23,42,0.05)";
const TICK = "#94a3b8";
const tooltipDefaults = {
  backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1,
  titleColor: "#0f172a", bodyColor: "#64748b", padding: 10, cornerRadius: 8,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${formatINRCompact(ctx.parsed?.y ?? 0)}` },
};

function Card({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]">
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold text-slate-700">{children}</p>;
}

export default function CalculatorClient() {
  const [amount, setAmount]   = useState<number>(50000);
  const [rawInput, setRawInput] = useState("50000");
  const [horizon, setHorizon] = useState<Horizon>(10);

  const moderate = SCENARIOS.find((s) => s.label === "Moderate")!;
  const moderateFV = futureValue(amount, moderate.rate, horizon);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    setRawInput(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) setAmount(parsed);
  }

  const lineLabels = Array.from({ length: 20 }, (_, i) => `Yr ${i + 1}`);
  const lineData: ChartData<"line"> = {
    labels: lineLabels,
    datasets: SCENARIOS.map((s) => ({
      label: `${s.label} (${(s.rate * 100).toFixed(0)}%)`,
      data: growthSeries(amount, s.rate, 20),
      borderColor: s.color, backgroundColor: "transparent",
      fill: false, tension: 0.35, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2,
    })),
  };
  const lineOptions: ChartOptions<"line"> = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { labels: { color: TICK, font: FONT, boxWidth: 12, boxHeight: 2 } }, tooltip: tooltipDefaults },
    scales: {
      x: { ticks: { color: TICK, font: FONT, maxTicksLimit: 10 }, grid: { color: GRID }, border: { color: GRID } },
      y: { ticks: { color: TICK, font: FONT, callback: (v) => formatINRCompact(Number(v)) }, grid: { color: GRID }, border: { color: GRID } },
    },
  };

  const barData: ChartData<"bar"> = {
    labels: SCENARIOS.map((s) => `${s.label}\n${(s.rate * 100).toFixed(0)}%`),
    datasets: [{
      label: "Future Value",
      data: SCENARIOS.map((s) => futureValue(amount, s.rate, horizon)),
      backgroundColor: SCENARIOS.map((s) => `${s.color}22`),
      borderColor: SCENARIOS.map((s) => s.color),
      borderWidth: 2, borderRadius: 6,
    }],
  };
  const barOptions: ChartOptions<"bar"> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipDefaults },
    scales: {
      x: { ticks: { color: TICK, font: FONT }, grid: { display: false }, border: { color: GRID } },
      y: { ticks: { color: TICK, font: FONT, callback: (v) => formatINRCompact(Number(v)) }, grid: { color: GRID }, border: { color: GRID } },
    },
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Buy Now vs Invest</h1>
          <p className="mt-0.5 text-sm text-slate-400">Enter any amount to see its opportunity cost across three scenarios.</p>
        </div>

        {/* Inputs */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Amount (₹)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">₹</span>
              <input id="input-amount" type="text" inputMode="numeric"
                value={rawInput} onChange={handleAmountChange}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-base font-semibold text-slate-900 outline-none shadow-[0_1px_2px_0_rgb(15_23_42/0.04)] transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                placeholder="50000" />
            </div>
          </div>
          <div>
            <Label>Time Horizon</Label>
            <div id="horizon-chips" className="flex gap-2">
              {HORIZONS.map((h) => (
                <button key={h} id={`chip-${h}yr`} onClick={() => setHorizon(h)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${h === horizon ? "bg-indigo-600 text-white shadow-[0_1px_3px_0_rgb(79_70_229/0.3)]" : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"}`}>
                  {h} yr
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card id="card-buy-now">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-sm">🛍️</span>
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">Buy Now</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900">{formatINR(amount)}</p>
            <p className="mt-0.5 text-sm text-slate-400">spent today</p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">After {horizon} years: <span className="font-semibold text-red-500">₹0</span> in financial return.</p>
            </div>
          </Card>

          <Card id="card-invest">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-sm">📈</span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Invest — Moderate (12%)</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900">{formatINR(moderateFV)}</p>
            <p className="mt-0.5 text-sm text-slate-400">in {horizon} years at 12% p.a.</p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">Growth: <span className="font-semibold text-emerald-600">{growthMultiple(amount, moderateFV)}</span> over {horizon} years.</p>
            </div>
          </Card>
        </div>

        {/* Scenario summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {SCENARIOS.map((s) => {
            const fv = futureValue(amount, s.rate, horizon);
            return (
              <Card key={s.label} id={`scenario-${s.label.toLowerCase()}`}>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: s.color }}>
                  {s.label} — {(s.rate * 100).toFixed(0)}%
                </p>
                <p className="text-2xl font-extrabold text-slate-900">{formatINR(fv)}</p>
                <p className="mt-0.5 text-sm text-slate-400">in {horizon} yr</p>
                <p className="mt-2 text-xs text-slate-400">
                  Gain: <span className="font-semibold text-slate-700">{formatINR(fv - amount)}</span> · {growthMultiple(amount, fv)}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Line chart */}
        <Card id="chart-growth-line">
          <h2 className="mb-1 text-sm font-bold text-slate-900">Growth Over 20 Years</h2>
          <p className="mb-5 text-xs text-slate-400">How <span className="font-semibold text-slate-700">{formatINR(amount)}</span> compounds across all three scenarios</p>
          <div className="chart-wrapper h-64 sm:h-80"><Line data={lineData} options={lineOptions} /></div>
        </Card>

        {/* Bar chart */}
        <div className="mt-4">
          <Card id="chart-scenario-bar">
            <h2 className="mb-1 text-sm font-bold text-slate-900">Scenario Comparison at {horizon} Years</h2>
            <p className="mb-5 text-xs text-slate-400">Final value of <span className="font-semibold text-slate-700">{formatINR(amount)}</span> in each scenario</p>
            <div className="chart-wrapper h-56 sm:h-72"><Bar data={barData} options={barOptions} /></div>
          </Card>
        </div>

        <p id="disclaimer" className="mt-8 text-center text-xs text-slate-300">
          ⚠️ Illustrative projections, not guaranteed returns. Past performance does not predict future results.
        </p>
      </div>
    </AppShell>
  );
}

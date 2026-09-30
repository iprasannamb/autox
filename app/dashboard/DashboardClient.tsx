"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Plus, Settings,
  Sparkles, Send, ChevronRight, ChevronDown, Check,
  Search, SlidersHorizontal, Lock, ArrowUpRight,
  RefreshCw, Bot, BrainCircuit, Wand2, Calendar, Mic,
  Utensils, Car, ShoppingBag, Monitor, Heart, BookOpen, Zap, Plane, Package,
  Trash2, X, HelpCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  futureValue, futureValueRecurring, formatINR, formatINRCompact,
} from "@/app/lib/finance";
import type { Expense, FinancialSettings } from "@/app/lib/types";
import { DEFAULT_SETTINGS } from "@/app/lib/types";
import type { CoachContext, ClassifiedExpense, ChatMessage, WhatIfResponse, WeeklyDigest } from "@/app/lib/ai-types";
import AppShell from "@/app/components/AppShell";

// ── Constants & Category Metadata ─────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; text: string; chart: string; border: string }> = {
  Food:          { icon: Utensils,    color: "#f97316", bg: "bg-orange-50",  text: "text-orange-600",  chart: "#f97316", border: "border-orange-100" },
  Transport:     { icon: Car,         color: "#0ea5e9", bg: "bg-sky-50",     text: "text-sky-600",     chart: "#0ea5e9", border: "border-sky-100" },
  Shopping:      { icon: ShoppingBag, color: "#ec4899", bg: "bg-pink-50",    text: "text-pink-600",    chart: "#ec4899", border: "border-pink-100" },
  Entertainment: { icon: Monitor,     color: "#8b5cf6", bg: "bg-violet-50",  text: "text-violet-600",  chart: "#8b5cf6", border: "border-violet-100" },
  Health:        { icon: Heart,       color: "#ef4444", bg: "bg-red-50",     text: "text-red-600",     chart: "#ef4444", border: "border-red-100" },
  Education:     { icon: BookOpen,    color: "#eab308", bg: "bg-yellow-50",  text: "text-yellow-600",  chart: "#eab308", border: "border-yellow-100" },
  Bills:         { icon: Zap,         color: "#06b6d4", bg: "bg-cyan-50",    text: "text-cyan-600",    chart: "#06b6d4", border: "border-cyan-100" },
  Travel:        { icon: Plane,       color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600", chart: "#10b981", border: "border-emerald-100" },
  Other:         { icon: Package,     color: "#64748b", bg: "bg-slate-100",  text: "text-slate-500",   chart: "#64748b", border: "border-slate-200" },
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food:          ["food","restaurant","cafe","coffee","lunch","dinner","breakfast","swiggy","zomato","pizza","burger","meal","snack","chai","biryani"],
  Transport:     ["uber","ola","petrol","fuel","auto","bus","metro","train","taxi","cab","rapido","rickshaw"],
  Shopping:      ["amazon","flipkart","clothes","shirt","dress","bag","mall","myntra","shop","meesho","blinkit","zepto"],
  Entertainment: ["movie","netflix","prime","spotify","concert","game","hotstar","youtube","pvr","inox","disney"],
  Health:        ["medicine","doctor","hospital","pharmacy","gym","fitness","yoga","dental","clinic","apollo"],
  Education:     ["course","book","udemy","coaching","fees","school","college","learning","class"],
  Bills:         ["electricity","water","internet","phone","rent","gas","insurance","emi","subscription","bill","recharge","jio","airtel"],
  Travel:        ["flight","hotel","trip","travel","holiday","vacation","booking","airbnb","oyo","irctc"],
};

function autoCategory(description: string): string {
  const lower = description.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return cat;
  }
  return "Other";
}

function getExpenseFV(e: Expense, ratePercent: number, years: number): number {
  const r = ratePercent / 100;
  if (e.is_recurring && e.recurring_frequency === "monthly") {
    return futureValueRecurring(e.amount, r, years);
  }
  return futureValue(e.amount, r, years);
}

function todayISO() { return new Date().toISOString().split("T")[0]; }

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

function uid() { return Math.random().toString(36).slice(2, 9); }

type NewExpense = Omit<Expense, "id" | "user_id" | "created_at">;
type Tab = "home" | "expenses" | "chart";
type AIMode = "coach" | "whatif" | "classify" | "digest";

// ── Sample Demo Financial Data ────────────────────────────────────────────────

const DEMO_USER = {
  id: "demo-user-1",
  email: "dwayne.tatum@autox.fi",
  name: "Dwayne Tatum",
  role: "Smart Wealth Builder",
};

const DEMO_EXPENSES: Expense[] = [
  {
    id: "exp-1",
    user_id: "demo-user-1",
    amount: 680,
    description: "Swiggy Gourmet Dinner",
    category: "Food",
    expense_date: new Date().toISOString().split("T")[0],
    notes: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "exp-2",
    user_id: "demo-user-1",
    amount: 240,
    description: "Blue Tokai Cold Brew",
    category: "Food",
    expense_date: new Date().toISOString().split("T")[0],
    notes: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "exp-3",
    user_id: "demo-user-1",
    amount: 420,
    description: "Uber Premier to Tech Park",
    category: "Transport",
    expense_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    notes: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "exp-4",
    user_id: "demo-user-1",
    amount: 2499,
    description: "Myntra Autumn Collection",
    category: "Shopping",
    expense_date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    notes: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "exp-5",
    user_id: "demo-user-1",
    amount: 649,
    description: "Netflix 4K Premium Plan",
    category: "Entertainment",
    expense_date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
    notes: null,
    is_recurring: true,
    recurring_frequency: "monthly",
    created_at: new Date().toISOString(),
  },
  {
    id: "exp-6",
    user_id: "demo-user-1",
    amount: 2200,
    description: "Tata Power Electricity Bill",
    category: "Bills",
    expense_date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0],
    notes: null,
    is_recurring: true,
    recurring_frequency: "monthly",
    created_at: new Date().toISOString(),
  },
  {
    id: "exp-7",
    user_id: "demo-user-1",
    amount: 1450,
    description: "Cult.fit Elite Yoga & Gym",
    category: "Health",
    expense_date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
    notes: null,
    is_recurring: true,
    recurring_frequency: "monthly",
    created_at: new Date().toISOString(),
  },
  {
    id: "exp-8",
    user_id: "demo-user-1",
    amount: 5000,
    description: "Nifty 50 Index SIP Automation",
    category: "Other",
    expense_date: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0],
    notes: null,
    is_recurring: true,
    recurring_frequency: "monthly",
    created_at: new Date().toISOString(),
  },
];

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#DDE5EE] bg-white px-3 py-2 shadow-lg text-xs">
      {label && <p className="mb-1 font-semibold text-[#0D1B2A]">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-sky-600">{formatINR(p.value)}</p>
      ))}
    </div>
  );
}

// ── Card Shell Component ───────────────────────────────────────────────────────

function BentoCard({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div
      id={id}
      className={`rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_14px_rgba(15,23,42,0.03)] transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

// ── Add Expense Modal ──────────────────────────────────────────────────────────

function AddExpenseModal({ onSave, onClose }: { onSave: (d: NewExpense) => Promise<void>; onClose: () => void }) {
  const [amount, setAmount]       = useState("");
  const [desc, setDesc]           = useState("");
  const [category, setCategory]   = useState("Other");
  const [date, setDate]           = useState(todayISO());
  const [recurring, setRecurring] = useState(false);
  const [freq, setFreq]           = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [saving, setSaving]       = useState(false);

  function handleDesc(v: string) {
    setDesc(v);
    if (v.length > 2) setCategory(autoCategory(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    setSaving(true);
    await onSave({
      amount: parsed,
      description: desc.trim(),
      category,
      expense_date: date,
      notes: null,
      is_recurring: recurring,
      recurring_frequency: recurring ? freq : null,
    });
  }

  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.Other;
  const Icon = cfg.icon;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl border border-[#DDE5EE] bg-white p-6 shadow-2xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0D1B2A]">Log New Expense</h2>
            <p className="text-xs text-[#8BA3B8]">Track cash outflow and reveal growth potential</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8BA3B8] hover:bg-[#F0F4F8] hover:text-[#0D1B2A]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#3D5A73]">Amount (₹)</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-[#8BA3B8]">₹</span>
              <input
                id="input-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] py-2.5 pl-8 pr-4 text-sm font-bold text-[#0D1B2A] placeholder-[#8BA3B8] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                placeholder="450.00"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-[#3D5A73]">Description</label>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
                <Icon size={10} /> {category}
              </span>
            </div>
            <input
              id="input-description"
              type="text"
              required
              value={desc}
              onChange={(e) => handleDesc(e.target.value)}
              className="w-full rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#0D1B2A] placeholder-[#8BA3B8] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
              placeholder="e.g. Swiggy Lunch or Uber ride"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#3D5A73]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] px-3 py-2.5 text-xs font-semibold text-[#0D1B2A] outline-none focus:border-sky-500"
              >
                {Object.keys(CATEGORY_CONFIG).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#3D5A73]">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#0D1B2A] outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] p-3">
            <div>
              <p className="text-xs font-semibold text-[#0D1B2A]">Recurring Expense?</p>
              <p className="text-[11px] text-[#8BA3B8]">SIP, Netflix, gym, broadband</p>
            </div>
            <button
              type="button"
              onClick={() => setRecurring(!recurring)}
              className={`relative h-6 w-11 rounded-full transition-colors ${recurring ? "bg-sky-500" : "bg-[#CBD5E1]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${recurring ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {recurring && (
            <div className="flex gap-2">
              {(["weekly", "monthly", "yearly"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFreq(f)}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${freq === f ? "bg-sky-500 text-white" : "border border-[#DDE5EE] text-[#3D5A73] hover:bg-slate-50"}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[#DDE5EE] py-2.5 text-sm font-semibold text-[#3D5A73] hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-2xl bg-sky-500 py-2.5 text-sm font-bold text-white shadow-[0_2px_10px_0_rgb(14_165_233/0.35)] hover:bg-sky-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Outflow"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Settings Modal ─────────────────────────────────────────────────────────────

function SettingsModal({ settings, onSave, onClose }: { settings: FinancialSettings; onSave: (s: FinancialSettings) => Promise<void>; onClose: () => void }) {
  const [inflRate, setInflRate] = useState(String(settings.inflation_rate));
  const [rates, setRates]       = useState<number[]>(settings.return_rates);
  const [saving, setSaving]     = useState(false);
  const RATE_COLORS: Record<number, string> = { 6: "#6366f1", 8: "#0ea5e9", 10: "#10b981", 12: "#f59e0b" };

  function toggleRate(r: number) {
    setRates((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r].sort((a, b) => a - b));
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ ...settings, inflation_rate: parseFloat(inflRate) || 6, return_rates: rates.length ? rates : [6, 8, 10, 12] });
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-md rounded-3xl border border-[#DDE5EE] bg-white p-6 shadow-2xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0D1B2A]">Financial Projection Settings</h2>
            <p className="text-xs text-[#8BA3B8]">Configure inflation and return scenarios</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#8BA3B8] hover:bg-[#F0F4F8]">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#3D5A73]">Annual Inflation Rate (%)</label>
            <input id="input-inflation" type="number" min="0" max="20" step="0.5" value={inflRate}
              onChange={(e) => setInflRate(e.target.value)}
              className="w-32 rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] py-2 text-center text-sm font-bold text-[#0D1B2A] outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="mb-3 block text-xs font-semibold text-[#3D5A73]">Return Rate Scenarios (Compounding)</label>
            <div id="rate-toggles" className="flex gap-2">
              {[6, 8, 10, 12].map((r) => (
                <button key={r} type="button" onClick={() => toggleRate(r)}
                  className={`flex-1 rounded-2xl py-2.5 text-sm font-bold transition ${rates.includes(r) ? "text-white shadow-sm" : "border border-[#DDE5EE] text-[#8BA3B8] hover:bg-slate-50"}`}
                  style={rates.includes(r) ? { backgroundColor: RATE_COLORS[r] } : {}}>
                  {r}%
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-2xl border border-[#DDE5EE] py-2.5 text-sm font-semibold text-[#3D5A73] hover:bg-[#F8FAFC]">Cancel</button>
            <button id="btn-save-settings" onClick={handleSave} disabled={saving}
              className="flex-1 rounded-2xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60">
              {saving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Unified AI Financial Assistant (Core Dashboard Component) ─────────────────

const AI_STARTERS = [
  "Should I buy a ₹70,000 iPhone?",
  "Where am I overspending this month?",
  "How much can I save by cooking dinner?",
];

const WHATIF_EXAMPLES = [
  "What if I stop spending ₹200 daily on coffee?",
  "What if I skip eating out (₹500/day)?",
  "What if I cancel ₹1,500/mo unused subscriptions?",
];

function UnifiedAIAssistant({
  context,
  expenses,
  onAddExpenses,
  externalPrompt,
  onClearExternalPrompt,
}: {
  context: CoachContext;
  expenses: Expense[];
  onAddExpenses: (newItems: ClassifiedExpense[]) => Promise<void>;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
}) {
  const [mode, setMode] = useState<AIMode>("coach");

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // What-If State
  const [whatIfQuery, setWhatIfQuery] = useState("");
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Smart Classifier State
  const [classifyText, setClassifyText] = useState("");
  const [classifyResults, setClassifyResults] = useState<ClassifiedExpense[]>([]);
  const [classifyLoading, setClassifyLoading] = useState(false);

  // Weekly Digest State
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);

  // Trigger from top search bar if provided
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      setMode("coach");
      sendChat(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // 1. Send Chat
  async function sendChat(textToSend?: string) {
    const text = (textToSend ?? chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput("");
    const newMsg: ChatMessage = { id: uid(), role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, newMsg]);
    setChatLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, context }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: data.reply ?? "I've reviewed your figures. Keep consistent with your monthly savings target!", timestamp: Date.now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: "Compounding is key: investing even ₹200 daily at 12% returns yields ~₹15.2 Lakh in 10 years!", timestamp: Date.now() },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // 2. Run What-If
  async function runWhatIf(q?: string) {
    const text = (q ?? whatIfQuery).trim();
    if (!text || whatIfLoading) return;
    setWhatIfLoading(true);
    setWhatIfResult(null);
    try {
      const res = await fetch("/api/ai/whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json() as WhatIfResponse;
      setWhatIfResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setWhatIfLoading(false);
    }
  }

  // 3. Classify Text
  async function runClassify() {
    if (!classifyText.trim() || classifyLoading) return;
    setClassifyLoading(true);
    try {
      const res = await fetch("/api/ai/classify-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: classifyText }),
      });
      const data = await res.json() as { expenses?: ClassifiedExpense[] };
      setClassifyResults(data.expenses ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setClassifyLoading(false);
    }
  }

  // 4. Generate Digest
  async function generateDigest() {
    if (digestLoading) return;
    setDigestLoading(true);
    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses }),
      });
      const data = await res.json() as WeeklyDigest;
      setDigest(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDigestLoading(false);
    }
  }

  return (
    <BentoCard className="flex flex-col border-sky-200/80 bg-gradient-to-b from-[#F9FBFE] via-white to-white" id="unified-ai-assistant">
      {/* Header Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-[0_2px_8px_rgba(14,165,233,0.35)]">
            <Sparkles size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#0D1B2A]">AI Financial Assistant</h3>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">Gemini Active</span>
            </div>
            <p className="text-[11px] text-[#8BA3B8]">Connected to your live cashflow & compounding projections</p>
          </div>
        </div>

        {/* Mode Selector Pills */}
        <div className="flex items-center gap-1 rounded-2xl border border-[#DDE5EE] bg-white p-1 shadow-sm">
          {[
            { id: "coach", label: "Ask Coach", icon: Bot },
            { id: "whatif", label: "What-If", icon: BrainCircuit },
            { id: "classify", label: "Classify", icon: Wand2 },
            { id: "digest", label: "Weekly Digest", icon: Calendar },
          ].map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id as AIMode)}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-[#3D5A73] hover:bg-slate-50 hover:text-[#0D1B2A]"
                }`}
              >
                <Icon size={12} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mode 1: Ask Coach ──────────────────────────────────────────────── */}
      {mode === "coach" && (
        <div className="flex flex-1 flex-col space-y-3">
          {/* Conversation viewport */}
          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1" style={{ minHeight: 220, maxHeight: 310 }}>
            {messages.length === 0 ? (
              <div className="space-y-2.5 py-2">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5">
                  <p className="text-xs font-bold text-sky-900">👋 How can I guide your finances today?</p>
                  <p className="mt-1 text-xs text-sky-700 leading-relaxed">
                    I calculate the exact opportunity cost of big purchases, identify discretionary spending leaks, and model compounding returns.
                  </p>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8BA3B8]">Quick Questions</p>
                <div className="space-y-1.5">
                  {AI_STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendChat(s)}
                      className="block w-full rounded-2xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-left text-xs font-medium text-[#3D5A73] transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-700 shadow-xs"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-sky-500 text-white shadow-sm"
                          : "border border-[#E2E8F0] bg-white text-[#1E293B] shadow-xs"
                      }`}
                    >
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8BA3B8]">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:0.4s]" />
                    <span className="ml-1 text-[11px]">Gemini is calculating…</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>

          {/* Chat input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="coach-main-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
              placeholder="Ask about a purchase, budget, or investment…"
              className="flex-1 rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] px-4 py-2.5 text-xs text-[#0D1B2A] placeholder-[#8BA3B8] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
            />
            <button
              id="btn-coach-send"
              onClick={() => sendChat()}
              disabled={chatLoading || !chatInput.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-[0_2px_8px_rgba(14,165,233,0.35)] transition hover:bg-sky-600 disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Mode 2: What-If Simulator ──────────────────────────────────────── */}
      {mode === "whatif" && (
        <div className="flex flex-1 flex-col space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {WHATIF_EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setWhatIfQuery(ex); runWhatIf(ex); }}
                className="rounded-full border border-[#DDE5EE] bg-white px-3 py-1 text-xs text-[#475569] transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              >
                {ex.replace("What if I ", "")}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              id="whatif-dashboard-input"
              value={whatIfQuery}
              onChange={(e) => setWhatIfQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runWhatIf()}
              placeholder="e.g. What if I stop spending ₹200 daily on coffee?"
              className="flex-1 rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] px-4 py-2.5 text-xs text-[#0D1B2A] placeholder-[#8BA3B8] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
            />
            <button
              onClick={() => runWhatIf()}
              disabled={whatIfLoading || !whatIfQuery.trim()}
              className="flex items-center gap-1.5 rounded-2xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-600 disabled:opacity-40"
            >
              {whatIfLoading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <BrainCircuit size={13} />}
              Simulate
            </button>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ minHeight: 180, maxHeight: 260 }}>
            {whatIfResult ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold capitalize text-sky-900">{whatIfResult.parsed.habit}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-sky-700 shadow-xs">
                      ₹{whatIfResult.parsed.dailyAmount}/day
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-sky-700">
                    Annual savings: <strong className="font-extrabold text-[#0D1B2A]">₹{(whatIfResult.parsed.dailyAmount * 365).toLocaleString("en-IN")}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {whatIfResult.projections.map((p) => (
                    <div key={p.rate} className="rounded-2xl border border-[#E2E8F0] bg-white p-3 text-center shadow-xs">
                      <p className="text-[11px] font-bold" style={{ color: p.color }}>{p.label} ({p.rate}%)</p>
                      <div className="mt-2 space-y-1">
                        <div>
                          <p className="text-[10px] text-[#8BA3B8]">5 Years</p>
                          <p className="text-xs font-extrabold text-[#0D1B2A]">{formatINRCompact(p.fv5yr)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#8BA3B8]">10 Years</p>
                          <p className="text-xs font-extrabold text-emerald-600">{formatINRCompact(p.fv10yr)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#8BA3B8]">20 Years</p>
                          <p className="text-xs font-extrabold text-sky-600">{formatINRCompact(p.fv20yr)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center text-xs text-[#8BA3B8]">
                <p>Run a simulation above to see how small daily habits compound into lakhs over time.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mode 3: Smart Expense Classifier ──────────────────────────────── */}
      {mode === "classify" && (
        <div className="flex flex-1 flex-col space-y-3">
          <textarea
            value={classifyText}
            onChange={(e) => setClassifyText(e.target.value)}
            placeholder="Paste messy text e.g. 'Swiggy 450, Uber 230, Myntra 1999, Netflix 649'…"
            rows={2}
            className="w-full resize-none rounded-2xl border border-[#DDE5EE] bg-[#F8FAFC] px-3.5 py-2.5 text-xs text-[#0D1B2A] placeholder-[#8BA3B8] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
          />

          <div className="flex gap-2">
            <button
              onClick={runClassify}
              disabled={classifyLoading || !classifyText.trim()}
              className="flex items-center gap-1.5 rounded-2xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-600 disabled:opacity-40"
            >
              {classifyLoading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Wand2 size={13} />}
              ✨ Classify with AI
            </button>
            <button
              onClick={() => setClassifyText("Swiggy 450, Uber 230, Myntra 1999, Starbucks 380")}
              className="rounded-2xl border border-[#DDE5EE] bg-white px-3 py-2 text-xs font-medium text-[#475569] hover:bg-slate-50"
            >
              Load Sample Text
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2" style={{ minHeight: 160, maxHeight: 220 }}>
            {classifyResults.length > 0 ? (
              <div className="space-y-1.5">
                {classifyResults.map((item, i) => {
                  const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.Other;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${cfg.bg}`}>
                          <Icon size={13} style={{ color: cfg.color }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#0D1B2A]">{item.item}</p>
                          <span className={`text-[10px] font-medium ${cfg.text}`}>{item.category}</span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#0D1B2A]">{formatINR(item.amount)}</span>
                    </div>
                  );
                })}
                <button
                  onClick={async () => {
                    await onAddExpenses(classifyResults);
                    setClassifyResults([]);
                    setClassifyText("");
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:bg-emerald-600"
                >
                  <Plus size={14} /> Add All {classifyResults.length} Items to Dashboard
                </button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-[#8BA3B8]">
                Paste SMS receipts, card messages, or quick notes to parse them instantly.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mode 4: Weekly Digest ─────────────────────────────────────────── */}
      {mode === "digest" && (
        <div className="flex flex-1 flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8BA3B8]">{digest?.weekLabel ?? "AI Weekly Spending Report"}</span>
            <button
              onClick={generateDigest}
              disabled={digestLoading}
              className="flex items-center gap-1.5 rounded-2xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              <RefreshCw size={12} className={digestLoading ? "animate-spin" : ""} />
              {digest ? "Regenerate" : "Generate Digest"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3" style={{ minHeight: 180, maxHeight: 260 }}>
            {digest ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-xs">
                  <div>
                    <p className="text-[10px] text-[#8BA3B8]">Week's Total Spend</p>
                    <p className="text-base font-extrabold text-[#0D1B2A]">{formatINR(digest.totalSpent)}</p>
                  </div>
                  {digest.spendingChange !== null && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${digest.spendingChange > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {digest.spendingChange > 0 ? "▲ +" : "▼ "}{Math.abs(digest.spendingChange)}% vs last week
                    </span>
                  )}
                </div>

                {digest.unusualSpending && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                    <p className="font-bold">⚠ Unusual Spending Detected</p>
                    <p className="mt-0.5 text-[#475569]">{digest.unusualSpending}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8BA3B8]">Key Actionable Insights</p>
                  {digest.insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-white p-2.5 text-xs text-[#334155] shadow-xs">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-extrabold text-sky-700">
                        {i + 1}
                      </span>
                      <p className="leading-snug">{ins}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center text-xs text-[#8BA3B8]">
                <Calendar size={28} className="mb-2 text-[#CBD5E1]" />
                <p>Click Generate to compile an executive weekly breakdown powered by Gemini.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </BentoCard>
  );
}

// ── Concentric Tiered Rings / Bullseye Breakdown (Inspired by Reference Image) ─

function ConcentricCategoryRings({ catTotals, totalSpent }: { catTotals: { name: string; value: number }[]; totalSpent: number }) {
  const top4 = catTotals.slice(0, 4);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Visual Concentric Circle stack */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        {/* Tier 1 (Outermost - Largest Category) */}
        <div className="absolute inset-0 rounded-full border-4 border-orange-200 bg-orange-50/40 shadow-inner" />
        
        {/* Tier 2 */}
        <div className="absolute inset-3 rounded-full border-4 border-sky-200 bg-sky-50/50 shadow-inner" />
        
        {/* Tier 3 */}
        <div className="absolute inset-7 rounded-full border-4 border-pink-200 bg-pink-50/60 shadow-inner" />
        
        {/* Tier 4 (Core) */}
        <div className="absolute inset-11 flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100">Top</span>
          <span className="text-xs font-black">{top4[0] ? formatINRCompact(top4[0].value) : "₹0"}</span>
        </div>
      </div>

      {/* Category Pills Breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-2 w-full">
        {top4.map((c) => {
          const cfg = CATEGORY_CONFIG[c.name] ?? CATEGORY_CONFIG.Other;
          const pct = totalSpent > 0 ? ((c.value / totalSpent) * 100).toFixed(0) : "0";
          return (
            <div key={c.name} className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.chart }} />
                <span className="truncate text-xs font-medium text-[#3D5A73]">{c.name}</span>
              </div>
              <span className="text-xs font-extrabold text-[#0D1B2A]">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Home Tab (The Redesigned Fintech Dashboard) ───────────────────────────────

function HomeTab({
  expenses,
  settings,
  user,
  onAddExpense,
  onBatchAddExpenses,
  onDeleteExpense,
  onOpenSettings,
}: {
  expenses: Expense[];
  settings: FinancialSettings;
  user: { id: string; email?: string; name?: string; role?: string } | null;
  onAddExpense: () => void;
  onBatchAddExpenses: (newItems: ClassifiedExpense[]) => Promise<void>;
  onDeleteExpense: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<string>("All");
  const [topAskPrompt, setTopAskPrompt] = useState("");
  const [externalPromptToSend, setExternalPromptToSend] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<number | null>(4);

  // Calculations
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const total10yr  = useMemo(() => expenses.reduce((s, e) => s + getExpenseFV(e, 10, 10), 0), [expenses]);

  const catTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  // 7-day spending trend
  const trendData = useMemo(() => {
    const days: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short" });
      const amount = expenses.filter((e) => e.expense_date === iso).reduce((s, e) => s + e.amount, 0);
      days.push({ day: dayLabel, amount });
    }
    return days;
  }, [expenses]);

  // Month comparison
  const now = new Date();
  const thisMonthTotal = useMemo(() => {
    const m = now.getMonth(), y = now.getFullYear();
    return expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const lastMonthTotal = useMemo(() => {
    let m = now.getMonth() - 1, y = now.getFullYear();
    if (m < 0) { m = 11; y--; }
    return expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const monthDelta = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
  const monthlyRecurring = useMemo(() => {
    return expenses.filter((e) => e.is_recurring && e.recurring_frequency === "monthly").reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  // Monthly Budget (configurable or default ₹50,000)
  const monthlyBudget = 50000;
  const remainingBudget = Math.max(0, monthlyBudget - thisMonthTotal);
  const budgetPercentUsed = Math.min(100, Math.round((thisMonthTotal / monthlyBudget) * 100));

  // 10yr compounding multiplier
  const wealthMultiplier = totalSpent > 0 ? (total10yr / totalSpent).toFixed(1) : "2.6";

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (activityFilter === "All") return true;
      if (activityFilter === "Recurring") return e.is_recurring;
      return e.category === activityFilter;
    });
  }, [expenses, searchQuery, activityFilter]);

  // Coach context
  const coachContext: CoachContext = useMemo(() => ({
    totalExpenses: Math.round(totalSpent),
    expenseCount: expenses.length,
    topCategories: catTotals.slice(0, 5).map(({ name, value }) => ({ category: name, total: Math.round(value) })),
    monthlyRecurring: Math.round(monthlyRecurring),
  }), [expenses, totalSpent, catTotals, monthlyRecurring]);

  // Day info for date circle
  const dayNumber = now.getDate();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "short" });
  const monthName = now.toLocaleDateString("en-US", { month: "long" });

  const userName = user?.name || user?.email?.split("@")[0] || "Dwayne Tatum";
  const userRole = user?.role || "Smart Wealth Engine";

  return (
    <div className="space-y-6">
      {/* ── TOP UTILITY ROW (Inspired by Reference Top Bar) ────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
        {/* Left Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F172A] text-white shadow-sm font-black text-sm tracking-tighter">
            Nº
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#0D1B2A] tracking-tight">autoX Wealth</h1>
            <p className="text-[11px] font-medium text-[#8BA3B8]">Smart Financial Dashboard</p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses & activities…"
              className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-4 text-xs text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:bg-white"
            />
          </div>

          {/* Quick Add Button */}
          <button
            onClick={onAddExpense}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#334155] transition hover:bg-sky-50 hover:text-sky-600"
            title="Log Expense"
          >
            <Plus size={16} />
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] py-1.5 pl-1.5 pr-3 shadow-2xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-[11px] font-bold text-white shadow-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-[#0F172A] leading-tight capitalize">{userName}</p>
              <p className="text-[10px] text-[#8BA3B8]">{userRole}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BANNER / DATE & HERO GREETING (Inspired by Reference Banner) ────── */}
      <div className="grid gap-4 lg:grid-cols-12 items-stretch">
        {/* Date & Quick Action Badge */}
        <div className="lg:col-span-4 flex items-center justify-between gap-3 rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-sky-100 bg-[#F8FAFC] text-2xl font-black text-[#0F172A] shadow-inner">
              {dayNumber}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8BA3B8]">{dayOfWeek},</p>
              <p className="text-sm font-extrabold text-[#0D1B2A]">{monthName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddExpense}
              className="flex items-center gap-1.5 rounded-full bg-[#E15B45] px-4 py-2.5 text-xs font-bold text-white shadow-[0_2px_10px_rgba(225,91,69,0.35)] transition hover:bg-[#d04f3a] active:scale-95"
            >
              + Add Outflow →
            </button>
            <button
              onClick={onOpenSettings}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"
              title="Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Hero Interactive Greeting & Prompt Bar */}
        <div className="lg:col-span-8 flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-gradient-to-r from-white via-[#F8FBFE] to-sky-50/40 p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#0F172A]">
                Hey, Need help? 👋
              </h2>
              <p className="text-xs font-medium text-[#64748B] mt-0.5">
                Ask anything about your money, cut habits, or test future wealth growth!
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Sparkles size={18} />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={topAskPrompt}
                onChange={(e) => setTopAskPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topAskPrompt.trim()) {
                    setExternalPromptToSend(topAskPrompt);
                    setTopAskPrompt("");
                  }
                }}
                placeholder="Type question: 'Should I buy a ₹70k iPhone?' or 'How can I save ₹5k?'…"
                className="w-full rounded-full border border-[#DDE5EE] bg-white py-2.5 pl-4 pr-10 text-xs text-[#0D1B2A] placeholder-[#94A3B8] shadow-xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              />
              <button
                onClick={() => {
                  if (topAskPrompt.trim()) {
                    setExternalPromptToSend(topAskPrompt);
                    setTopAskPrompt("");
                  }
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-600"
              >
                <ArrowUpRight size={13} />
              </button>
            </div>
            <button
              onClick={() => {
                setExternalPromptToSend("Analyze my current spending breakdown and tell me where I can cut costs.");
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#DDE5EE] text-[#475569] shadow-xs transition hover:bg-slate-50 hover:text-sky-600"
              title="Voice/Instant Insight"
            >
              <Mic size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── BENTO GRID ROW 1: PRIMARY FINANCIAL CARDS ──────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* CARD 1: Virtual Smart Vault / Expense Card (Inspired by VISA card in reference) */}
        <BentoCard className="flex flex-col justify-between" id="card-vault">
          <div>
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F172A] text-[10px] font-black text-white">X</span>
                <span className="text-xs font-bold text-[#0F172A]">autoX Vault</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">Active Tracking</span>
            </div>

            <p className="mt-3 text-[11px] text-[#8BA3B8]">Linked to main account</p>
            <p className="font-mono text-base font-bold tracking-widest text-[#0D1B2A]">•••• 2719</p>

            {/* Quick Action Pills (Like [Receive] [Send] in reference image) */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={onAddExpense}
                className="flex-1 rounded-full bg-[#0D1B2A] py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                + Log Expense
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("unified-ai-assistant");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex-1 rounded-full border border-[#DDE5EE] bg-[#F8FAFC] py-2 text-xs font-bold text-[#334155] transition hover:bg-slate-100"
              >
                ⚡ AI Classify
              </button>
            </div>

            {/* Budget & Spending Progress Bar */}
            <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#64748B]">Remaining Budget</span>
                <span className="font-extrabold text-[#0D1B2A]">{formatINR(remainingBudget)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetPercentUsed > 90 ? "bg-red-500" : budgetPercentUsed > 75 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${budgetPercentUsed}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-[#8BA3B8]">
                <span>Spent: {formatINRCompact(thisMonthTotal)}</span>
                <span>Budget: {formatINRCompact(monthlyBudget)} ({budgetPercentUsed}%)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-3 text-xs">
            <div>
              <p className="text-[10px] text-[#8BA3B8]">Monthly recurring commitments</p>
              <p className="font-bold text-[#0D1B2A]">{formatINR(monthlyRecurring)}</p>
            </div>
            <button onClick={onOpenSettings} className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700">
              Edit limits ✏️
            </button>
          </div>
        </BentoCard>

        {/* CARD 2: Dual Metric Income & Spending (Inspired by Total income / Total paid in reference) */}
        <BentoCard className="flex flex-col justify-between" id="card-metrics">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8BA3B8]">Spending Overview</p>
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#475569]">Monthly ▾</span>
            </div>

            {/* Metric 1 */}
            <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B]">Total Tracked Spending</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#94A3B8]">↺</span>
              </div>
              <p className="mt-1 text-2xl font-black text-[#0D1B2A]">{formatINR(totalSpent)}</p>
              <p className="mt-0.5 text-[11px] text-[#8BA3B8]">{expenses.length} transactions logged</p>
            </div>

            {/* Metric 2 */}
            <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B]">This Month Outflow</span>
                <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  monthDelta > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                }`}>
                  {monthDelta > 0 ? "▲ +" : "▼ "}{Math.abs(monthDelta).toFixed(0)}%
                </div>
              </div>
              <p className="mt-1 text-2xl font-black text-[#E15B45]">{formatINR(thisMonthTotal)}</p>
              <p className="mt-0.5 text-[11px] text-[#8BA3B8]">vs {formatINRCompact(lastMonthTotal)} last month</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-3 text-xs">
            <span className="text-[11px] text-[#8BA3B8]">Compounded portfolio mode</span>
            <span className="font-bold text-[#E15B45] flex items-center gap-1">
              View on chart mode →
            </span>
          </div>
        </BentoCard>

        {/* CARD 3: 10-Yr Compounding Multiplier Ring & Security (Inspired by 36% ring & Lock in reference) */}
        <BentoCard className="flex flex-col justify-between" id="card-growth-ring">
          <div>
            {/* System Lock Badge */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F5F9] text-[#0F172A]">
                  <Lock size={13} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">Wealth Vault Lock</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Active Capital Protection</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Circular Compounding Growth Gauge */}
            <div className="my-4 flex flex-col items-center justify-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                {/* SVG Progress Ring */}
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="transparent" stroke="#F1F5F9" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="transparent" stroke="#0F172A" strokeWidth="8"
                    strokeDasharray="264" strokeDashoffset="75" strokeLinecap="round"
                  />
                  <circle
                    cx="50" cy="50" r="42" fill="transparent" stroke="#E15B45" strokeWidth="8"
                    strokeDasharray="264" strokeDashoffset="210" strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-[#0D1B2A]">{wealthMultiplier}x</span>
                  <span className="text-[10px] font-semibold text-[#8BA3B8]">10-Yr Growth</span>
                </div>
              </div>
              <p className="mt-2 text-xs font-bold text-[#0D1B2A]">Wealth Multiplier Potential</p>
              <p className="text-[11px] text-[#64748B]">Invested at 10% annual equity CAGR</p>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-2.5 text-center">
            <span className="text-[11px] text-sky-800">
              Future Value: <strong className="font-extrabold text-sky-950">{formatINRCompact(total10yr)}</strong> in 10 years
            </span>
          </div>
        </BentoCard>
      </div>

      {/* ── BENTO GRID ROW 2: VELOCITY TREND & CATEGORY ARCHITECTURE ────────── */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Spending Velocity Trend (Inspired by Main Stocks Sparkline in reference) */}
        <BentoCard className="lg:col-span-7 flex flex-col justify-between" id="card-velocity">
          <div>
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#0D1B2A]">7-Day Spending Velocity</h3>
                <p className="text-xs text-[#8BA3B8]">Daily expenditure & volatility</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-[#0D1B2A]">
                  {formatINR(trendData.reduce((s, d) => s + d.amount, 0))}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">+4.2%</span>
              </div>
            </div>

            <div className="mt-4 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E15B45" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#E15B45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatINRCompact(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#E15B45"
                    strokeWidth={2.5}
                    fill="url(#velocityGrad)"
                    dot={{ r: 3, fill: "#E15B45" }}
                    activeDot={{ r: 5, fill: "#0F172A", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[#8BA3B8]">
            <span>Peak day: {trendData.reduce((prev, curr) => curr.amount > prev.amount ? curr : prev, { day: "-", amount: 0 }).day}</span>
            <span className="font-semibold text-sky-600">Daily average: {formatINR(Math.round(trendData.reduce((s, d) => s + d.amount, 0) / 7))}</span>
          </div>
        </BentoCard>

        {/* Concentric Category Breakdown (Inspired by "Annual profits" tiered circles in reference) */}
        <BentoCard className="lg:col-span-5 flex flex-col justify-between" id="card-concentric-categories">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#0D1B2A]">Annual Outflow Pillars</h3>
              <p className="text-xs text-[#8BA3B8]">Category distribution</p>
            </div>
            <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold text-[#475569]">2026 ▾</span>
          </div>

          <div className="my-2">
            <ConcentricCategoryRings catTotals={catTotals} totalSpent={totalSpent} />
          </div>

          <div className="border-t border-[#F1F5F9] pt-2 text-center">
            <p className="text-[11px] text-[#8BA3B8]">
              Top spend: <strong className="text-[#0D1B2A]">{catTotals[0]?.name ?? "None"}</strong> ({catTotals[0] ? formatINR(catTotals[0].value) : "₹0"})
            </p>
          </div>
        </BentoCard>
      </div>

      {/* ── BENTO GRID ROW 3: UNIFIED AI ASSISTANT & ACTIVITY MANAGER ───────── */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        {/* Unified AI Financial Assistant (Core Dashboard Centerpiece) */}
        <div className="lg:col-span-7">
          <UnifiedAIAssistant
            context={coachContext}
            expenses={expenses}
            onAddExpenses={onBatchAddExpenses}
            externalPrompt={externalPromptToSend}
            onClearExternalPrompt={() => setExternalPromptToSend("")}
          />
        </div>

        {/* Activity Manager / Recent Transactions (Inspired by Activity Manager in reference) */}
        <BentoCard className="lg:col-span-5 flex flex-col" id="card-activity-manager">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#0D1B2A]">Activity Manager</h3>
              <p className="text-xs text-[#8BA3B8]">{expenses.length} total entries</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <SlidersHorizontal size={13} />
              <span>Filters</span>
            </div>
          </div>

          {/* Activity Category Filter Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["All", "Food", "Transport", "Shopping", "Recurring"].map((f) => (
              <button
                key={f}
                onClick={() => setActivityFilter(f)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  activityFilter === f
                    ? "bg-[#0F172A] text-white"
                    : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Transaction items list */}
          <div className="mt-3 space-y-2 overflow-y-auto pr-1" style={{ minHeight: 240, maxHeight: 310 }}>
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Wallet size={24} className="text-[#CBD5E1] mb-1" />
                <p className="text-xs font-bold text-[#0D1B2A]">No matching activities</p>
                <p className="text-[11px] text-[#8BA3B8]">Try selecting a different filter or search</p>
              </div>
            ) : (
              filteredActivities.slice(0, 7).map((e) => {
                const cfg = CATEGORY_CONFIG[e.category] ?? CATEGORY_CONFIG.Other;
                const Icon = cfg.icon;
                const fv10yr = getExpenseFV(e, 10, 10);
                return (
                  <div
                    key={e.id}
                    className="group flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-2.5 transition hover:border-sky-200 hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                        <Icon size={14} style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#0D1B2A]">{e.description}</p>
                        <p className="text-[10px] text-[#8BA3B8]">
                          {fmtDate(e.expense_date)} · <span className={cfg.text}>{e.category}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-[#0D1B2A]">−{formatINR(e.amount)}</p>
                        <p className="text-[10px] font-bold text-emerald-600">→ {formatINRCompact(fv10yr)}</p>
                      </div>
                      <button
                        onClick={() => onDeleteExpense(e.id)}
                        className="opacity-0 group-hover:opacity-100 transition rounded-lg p-1 text-[#CBD5E1] hover:bg-red-50 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Feedback & Satisfaction Review (Inspired by "How is your business management going?" in reference) */}
          <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-center">
            <p className="text-[11px] font-bold text-[#0D1B2A]">How is your wealth discipline going?</p>
            <div className="mt-2 flex justify-center gap-3">
              {["😞", "😐", "🙂", "😊", "🤩"].map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => setFeedbackRating(idx)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
                    feedbackRating === idx ? "bg-white shadow-md scale-110 ring-2 ring-sky-400" : "hover:bg-white"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}

// ── Expenses Tab Content ───────────────────────────────────────────────────────

function ExpensesTab({
  expenses,
  settings,
  onDelete,
  onAddExpense,
}: {
  expenses: Expense[];
  settings: FinancialSettings;
  onDelete: (id: string) => void;
  onAddExpense: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const RATE_COLORS: Record<number, string> = { 6: "#6366f1", 8: "#0ea5e9", 10: "#10b981", 12: "#f59e0b" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0D1B2A]">All Tracked Outflows</h2>
          <p className="text-sm text-[#8BA3B8]">{expenses.length} entries · tap any row to inspect compounded opportunity cost</p>
        </div>
        <button
          onClick={onAddExpense}
          className="flex items-center gap-1.5 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-600"
        >
          <Plus size={14} /> Add Outflow
        </button>
      </div>

      {expenses.length === 0 ? (
        <BentoCard className="py-20 text-center">
          <Wallet size={36} className="mx-auto mb-2 text-[#CBD5E1]" />
          <p className="font-bold text-[#0D1B2A]">No expenses logged yet</p>
          <p className="mt-1 text-sm text-[#8BA3B8]">Log your first outflow above or use the AI Smart Classifier.</p>
          <button onClick={onAddExpense} className="mt-4 rounded-2xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white">
            + Log Expense
          </button>
        </BentoCard>
      ) : (
        <div className="space-y-2">
          {expenses.map((e, i) => {
            const cfg = CATEGORY_CONFIG[e.category] ?? CATEGORY_CONFIG.Other;
            const Icon = cfg.icon;
            const isOpen = expanded === e.id;
            const activeRates = [...settings.return_rates].sort((a, b) => a - b);
            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs">
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F8FAFC]"
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon size={15} style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#0D1B2A]">{e.description}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[#8BA3B8]">
                        <span className={cfg.text}>{e.category}</span>
                        <span>·</span>
                        <span>{fmtDate(e.expense_date)}</span>
                        {e.is_recurring && (
                          <>
                            <span>·</span>
                            <span className="text-sky-600 font-semibold">🔁 {e.recurring_frequency}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold text-[#0D1B2A]">−{formatINR(e.amount)}</p>
                      <p className="text-[10px] font-bold text-emerald-600">→ {formatINRCompact(getExpenseFV(e, 10, 10))} in 10yr</p>
                    </div>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}
                      className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#CBD5E1] hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden border-t border-[#E2E8F0] bg-[#F8FAFC] p-4"
                      >
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8BA3B8]">
                          Compounding Growth if Invested Instead
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="bg-[#F8FAFC]">
                                <th className="px-3 py-2 text-left font-bold text-[#8BA3B8]">Rate</th>
                                {[5, 10, 15, 20, 30].map((h) => (
                                  <th key={h} className="px-2 py-2 text-right font-bold text-[#8BA3B8]">{h}yr</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                              {activeRates.map((rate) => (
                                <tr key={rate} className="hover:bg-[#F8FAFC]">
                                  <td className="px-3 py-2 font-black" style={{ color: RATE_COLORS[rate] ?? "#64748b" }}>{rate}%</td>
                                  {[5, 10, 15, 20, 30].map((h) => (
                                    <td key={h} className="px-2 py-2 text-right font-semibold text-[#3D5A73]">
                                      {formatINRCompact(getExpenseFV(e, rate, h))}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Chart Tab Content ──────────────────────────────────────────────────────────

function ChartTab({ expenses, settings }: { expenses: Expense[]; settings: FinancialSettings }) {
  const RATE_COLORS: Record<number, string> = { 6: "#6366f1", 8: "#0ea5e9", 10: "#10b981", 12: "#f59e0b" };
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const activeRates = [...settings.return_rates].sort((a, b) => a - b);

  const chartData = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => {
      const row: Record<string, number | string> = { year: `Yr ${i + 1}` };
      for (const rate of activeRates) {
        row[`${rate}%`] = Math.round(expenses.reduce((sum, e) => sum + getExpenseFV(e, rate, i + 1), 0));
      }
      return row;
    }), [expenses, activeRates]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#0D1B2A]">30-Year Compounding Projection</h2>
        <p className="text-sm text-[#8BA3B8]">What all your tracked expenses could grow into across return scenarios</p>
      </div>

      <BentoCard className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#0D1B2A]">{formatINR(totalSpent)} Invested Today</p>
            <p className="text-xs text-[#8BA3B8]">Projections for {expenses.length} tracked items</p>
          </div>
          <div className="flex gap-2">
            {activeRates.map((r) => (
              <div key={r} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RATE_COLORS[r] }} />
                <span className="text-xs font-bold text-[#64748B]">{r}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-72 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                {activeRates.map((rate) => (
                  <linearGradient key={rate} id={`grad${rate}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={RATE_COLORS[rate]} stopOpacity={0.16} />
                    <stop offset="95%" stopColor={RATE_COLORS[rate]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatINRCompact(v)} />
              <Tooltip content={<ChartTooltip />} />
              {activeRates.map((rate) => (
                <Area
                  key={rate}
                  type="monotone"
                  dataKey={`${rate}%`}
                  stroke={RATE_COLORS[rate]}
                  strokeWidth={2}
                  fill={`url(#grad${rate})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </BentoCard>
    </div>
  );
}

// ── Main DashboardClient ──────────────────────────────────────────────────────

export default function DashboardClient() {
  const supabase = createClient();
  const router   = useRouter();
  const params   = useSearchParams();

  const [user, setUser]                 = useState<{ id: string; email?: string; name?: string; role?: string } | null>(null);
  const [expenses, setExpenses]         = useState<Expense[]>([]);
  const [settings, setSettings]         = useState<FinancialSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]           = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab]                   = useState<Tab>((params.get("tab") as Tab) ?? "home");

  useEffect(() => {
    async function init() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email,
            name: authUser.email?.split("@")[0],
            role: "Pro Account",
          });
          const [{ data: exps }, { data: sett }] = await Promise.all([
            supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
            supabase.from("financial_settings").select("*").eq("user_id", authUser.id).single(),
          ]);
          setExpenses(exps ?? []);
          if (sett) setSettings(sett);
        } else {
          // Demo / Guest Mode Fallback
          setUser(DEMO_USER);
          setExpenses(DEMO_EXPENSES);
        }
      } catch (e) {
        console.warn("Initializing with demo data", e);
        setUser(DEMO_USER);
        setExpenses(DEMO_EXPENSES);
      } finally {
        setLoading(false);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddExpense(data: NewExpense) {
    if (user && user.id !== "demo-user-1") {
      try {
        const { data: saved } = await supabase.from("expenses").insert([{ ...data, user_id: user.id }]).select().single();
        if (saved) setExpenses((prev) => [saved, ...prev]);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Local state update for demo
      const newEntry: Expense = {
        id: "exp-" + uid(),
        user_id: user?.id || "demo-user-1",
        created_at: new Date().toISOString(),
        ...data,
      };
      setExpenses((prev) => [newEntry, ...prev]);
    }
    setShowAdd(false);
  }

  async function handleBatchAddExpenses(newItems: ClassifiedExpense[]) {
    const today = todayISO();
    const prepared = newItems.map((item) => ({
      amount: item.amount,
      description: item.item,
      category: item.category,
      expense_date: today,
      notes: null,
      is_recurring: false,
      recurring_frequency: null,
    }));

    if (user && user.id !== "demo-user-1") {
      try {
        const toInsert = prepared.map((p) => ({ ...p, user_id: user.id }));
        const { data: saved } = await supabase.from("expenses").insert(toInsert).select();
        if (saved) setExpenses((prev) => [...saved, ...prev]);
      } catch (err) {
        console.error(err);
      }
    } else {
      const localEntries: Expense[] = prepared.map((p) => ({
        id: "exp-" + uid(),
        user_id: user?.id || "demo-user-1",
        created_at: new Date().toISOString(),
        ...p,
      }));
      setExpenses((prev) => [...localEntries, ...prev]);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (user && user.id !== "demo-user-1") {
      await supabase.from("expenses").delete().eq("id", id);
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSaveSettings(newSettings: FinancialSettings) {
    if (user && user.id !== "demo-user-1") {
      await supabase.from("financial_settings").upsert(
        { user_id: user.id, inflation_rate: newSettings.inflation_rate, return_rates: newSettings.return_rates },
        { onConflict: "user_id" }
      );
    }
    setSettings(newSettings);
    setShowSettings(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F4F8]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-sky-200 border-t-sky-500"
          />
          <p className="text-xs font-semibold text-[#8BA3B8]">Loading autoX Wealth Engine…</p>
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "home",     label: "Home" },
    { key: "expenses", label: `Expenses (${expenses.length})` },
    { key: "chart",    label: "Projections" },
  ];

  return (
    <AppShell user={user} activeTab={tab} onTabChange={(t) => setTab(t as Tab)}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Top Tab Bar & Quick Settings */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div id="dashboard-tabs" className="flex gap-1 rounded-2xl border border-[#DDE5EE] bg-white p-1 shadow-xs">
            {TABS.map((t) => (
              <button
                key={t.key}
                id={`tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  tab === t.key
                    ? "bg-[#0F172A] text-white shadow-sm"
                    : "text-[#475569] hover:bg-slate-50 hover:text-[#0D1B2A]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-open-settings"
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#DDE5EE] bg-white text-[#64748B] shadow-2xs hover:border-sky-300 hover:text-sky-600"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Tab Views */}
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <HomeTab
                expenses={expenses}
                settings={settings}
                user={user}
                onAddExpense={() => setShowAdd(true)}
                onBatchAddExpenses={handleBatchAddExpenses}
                onDeleteExpense={handleDeleteExpense}
                onOpenSettings={() => setShowSettings(true)}
              />
            </motion.div>
          )}
          {tab === "expenses" && (
            <motion.div key="expenses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <ExpensesTab
                expenses={expenses}
                settings={settings}
                onDelete={handleDeleteExpense}
                onAddExpense={() => setShowAdd(true)}
              />
            </motion.div>
          )}
          {tab === "chart" && (
            <motion.div key="chart" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <ChartTab expenses={expenses} settings={settings} />
            </motion.div>
          )}
        </AnimatePresence>

        <p id="disclaimer" className="mt-10 text-center text-[11px] text-[#94A3B8]">
          autoX Financial Engine · Opportunity cost projections assume reinvestment in broad market indices. Past performance does not guarantee future results.
        </p>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAdd && <AddExpenseModal onSave={handleAddExpense} onClose={() => setShowAdd(false)} />}
        {showSettings && <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </AppShell>
  );
}

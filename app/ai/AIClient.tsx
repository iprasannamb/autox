"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Bot,
  User,
  Send,
  Square,
  Trash2,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Calculator,
  Receipt,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { useAppData } from "@/app/lib/hooks";
import { formatINR, formatINRCompact } from "@/app/lib/finance";
import { CATEGORY_CONFIG } from "@/app/lib/constants";
import AppShell, { PageSkeleton } from "@/app/components/AppShell";
import type {
  ChatMessage,
  CoachContext,
  ClassifiedExpense,
  WhatIfResponse,
  WeeklyDigest,
  AIQuota,
} from "@/app/lib/ai-types";
import AIQuotaBadge from "@/app/components/AIQuotaBadge";

// Helper for unique IDs
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Tab options
type AITab = "coach" | "whatif" | "classify" | "digest";

const TABS: { id: AITab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "coach", label: "Money Coach", icon: Bot, badge: "Live" },
  { id: "whatif", label: "What-If Simulator", icon: TrendingUp },
  { id: "classify", label: "Smart Classifier", icon: Receipt },
  { id: "digest", label: "Weekly Digest", icon: BarChart3 },
];

// Coach prompt starters
const COACH_STARTERS = [
  {
    label: "Gadget opportunity cost",
    prompt: "Should I buy a ₹70,000 iPhone or invest that money instead?",
  },
  {
    label: "Dining & delivery spend",
    prompt: "Am I spending too much on Swiggy and dining out?",
  },
  {
    label: "Save ₹1 Lakh goal",
    prompt: "How can I realistically save ₹1,00,000 over the next 12 months?",
  },
  {
    label: "Subscriptions audit",
    prompt: "What are my recurring expenses and how can I optimize them?",
  },
];

// What-If preset examples
const WHAT_IF_PRESETS = [
  "What if I stop spending ₹200 daily on coffee?",
  "What if I skip weekend dining out (₹600/day)?",
  "What if I cancel ₹1,500/month recurring subscriptions?",
  "What if I save ₹100 every day on cab rides?",
];

// Classifier sample snippets
const SAMPLE_RECEIPTS = [
  "Swiggy 450, Uber 230, Myntra 1999, Netflix 649, Groceries 1200",
  "Zomato ₹320, Rapido ₹65, Apollo Pharmacy ₹890, Electricity Bill ₹2150",
  "Blue Tokai coffee 280, Metro recharge 500, Amazon shopping 3499",
];

export default function AIClient() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as AITab) || "coach";

  const {
    user,
    expenses,
    loading: dataLoading,
    batchAddExpenses,
    signOut,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<AITab>(initialTab);

  // ── AI Quota Tracking State ────────────────────────────────────────────────
  const [quota, setQuota] = useState<AIQuota | null>(null);
  const [isQuotaLoading, setIsQuotaLoading] = useState(false);

  const fetchQuota = useCallback(async () => {
    setIsQuotaLoading(true);
    try {
      const res = await fetch("/api/ai/quota");
      const data = await res.json();
      if (data?.quota) setQuota(data.quota);
    } catch (e) {
      console.warn("Could not fetch AI quota", e);
    } finally {
      setIsQuotaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  // Sync tab from query param if changed
  useEffect(() => {
    const tabParam = searchParams.get("tab") as AITab | null;
    if (tabParam && ["coach", "whatif", "classify", "digest"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // ── Financial Context calculation (Memoized) ──────────────────────────────
  const coachContext: CoachContext = useMemo(() => {
    let total = 0;
    const catMap: Record<string, number> = {};
    let recurring = 0;

    for (const exp of expenses) {
      total += exp.amount;
      catMap[exp.category] = (catMap[exp.category] ?? 0) + exp.amount;
      if (exp.is_recurring && exp.recurring_frequency === "monthly") {
        recurring += exp.amount;
      }
    }

    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, catTotal]) => ({ category, total: catTotal }));

    return {
      totalExpenses: total,
      expenseCount: expenses.length,
      topCategories,
      monthlyRecurring: recurring,
    };
  }, [expenses]);

  // ── Coach State & Abort Controller ────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coachInput, setCoachInput] = useState("");
  const [isCoachStreaming, setIsCoachStreaming] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const coachAbortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (activeTab === "coach") {
      scrollToBottom();
    }
  }, [messages, isCoachStreaming, activeTab, scrollToBottom]);

  // Clean up all abort controllers on unmount
  useEffect(() => {
    return () => {
      coachAbortRef.current?.abort();
      whatIfAbortRef.current?.abort();
      classifyAbortRef.current?.abort();
      digestAbortRef.current?.abort();
    };
  }, []);

  // ── Send Coach Message (Streaming) ────────────────────────────────────────
  const handleSendCoach = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? coachInput).trim();
      if (!text || isCoachStreaming) return;

      // Abort previous in-flight coach request if any
      coachAbortRef.current?.abort();
      coachAbortRef.current = new AbortController();

      setCoachError(null);
      setCoachInput("");

      const userMessage: ChatMessage = {
        id: uid(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const assistantMessageId = uid();
      const initialAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      // Optimistically append user message and prepare empty assistant bubble
      setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
      setIsCoachStreaming(true);

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/ai/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history,
            context: coachContext,
            stream: true,
          }),
          signal: coachAbortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${res.status}: Failed to reach AI coach.`);
        }

        // Handle streaming response if reader is available
        const reader = res.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulated }
                  : msg
              )
            );
          }
        } else {
          // Non-streaming fallback
          const data = (await res.json()) as { reply?: string; error?: string };
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: data.reply || data.error || "No response received." }
                : msg
            )
          );
        }
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") {
          // Request was cancelled intentionally — do not display error
          return;
        }
        console.error("Coach error:", err);
        const errMsg =
          err instanceof Error
            ? err.message
            : "The AI coach is currently unavailable. Please try again.";
        setCoachError(errMsg);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: "⚠️ I encountered an issue generating a response. Please retry.",
                }
              : msg
          )
        );
      } finally {
        setIsCoachStreaming(false);
      }
    },
    [coachInput, isCoachStreaming, messages, coachContext]
  );

  const handleStopCoach = useCallback(() => {
    coachAbortRef.current?.abort();
    setIsCoachStreaming(false);
  }, []);

  const handleClearCoach = useCallback(() => {
    coachAbortRef.current?.abort();
    setIsCoachStreaming(false);
    setMessages([]);
    setCoachError(null);
  }, []);

  // ── What-If Simulator State ───────────────────────────────────────────────
  const [whatIfQuery, setWhatIfQuery] = useState("");
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null);
  const [isWhatIfLoading, setIsWhatIfLoading] = useState(false);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);
  const whatIfAbortRef = useRef<AbortController | null>(null);

  const handleRunWhatIf = useCallback(
    async (presetQuery?: string) => {
      const q = (presetQuery ?? whatIfQuery).trim();
      if (!q) return;

      if (presetQuery) setWhatIfQuery(presetQuery);

      whatIfAbortRef.current?.abort();
      whatIfAbortRef.current = new AbortController();

      setIsWhatIfLoading(true);
      setWhatIfError(null);

      try {
        const res = await fetch("/api/ai/whatif", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: whatIfAbortRef.current.signal,
        });

        const data = (await res.json()) as WhatIfResponse & { error?: string };
        if (data.quota) setQuota(data.quota);
        if (!res.ok || data.error) {
          throw new Error(data.error || "Unable to calculate habit projection.");
        }
        setWhatIfResult(data);
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.error("What-If error:", err);
        setWhatIfError(
          err instanceof Error ? err.message : "Failed to project habit. Please try again."
        );
      } finally {
        setIsWhatIfLoading(false);
      }
    },
    [whatIfQuery]
  );

  // ── Smart Classifier State ────────────────────────────────────────────────
  const [classifyText, setClassifyText] = useState("");
  const [classifiedItems, setClassifiedItems] = useState<ClassifiedExpense[]>([]);
  const [isClassifyLoading, setIsClassifyLoading] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [classifySuccessMessage, setClassifySuccessMessage] = useState<string | null>(null);
  const [isAddingToExpenses, setIsAddingToExpenses] = useState(false);
  const classifyAbortRef = useRef<AbortController | null>(null);

  const handleClassify = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? classifyText).trim();
      if (!text) return;

      if (rawText) setClassifyText(rawText);

      classifyAbortRef.current?.abort();
      classifyAbortRef.current = new AbortController();

      setIsClassifyLoading(true);
      setClassifyError(null);
      setClassifySuccessMessage(null);

      try {
        const res = await fetch("/api/ai/classify-expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: classifyAbortRef.current.signal,
        });

        const data = (await res.json()) as {
          expenses?: ClassifiedExpense[];
          quota?: AIQuota;
          error?: string;
          notice?: string;
        };

        if (data.quota) setQuota(data.quota);

        if (data.expenses && data.expenses.length > 0) {
          setClassifiedItems(data.expenses);
          if (data.notice) {
            setClassifySuccessMessage(data.notice);
          }
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          setClassifiedItems([]);
          setClassifyError("No expenses detected. Try: 'Swiggy 450, Uber 230, Myntra 1999'");
        }
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.error("Classifier error:", err);
        setClassifyError(
          err instanceof Error ? err.message : "Unable to classify expenses. Please try again."
        );
      } finally {
        setIsClassifyLoading(false);
      }
    },
    [classifyText]
  );

  const handleAddClassifiedToExpenses = useCallback(async () => {
    if (classifiedItems.length === 0 || isAddingToExpenses) return;
    setIsAddingToExpenses(true);
    setClassifyError(null);
    try {
      await batchAddExpenses(classifiedItems);
      const count = classifiedItems.length;
      setClassifySuccessMessage(`Successfully added ${count} expense${count > 1 ? "s" : ""} to your tracker!`);
      setClassifiedItems([]);
      setClassifyText("");
    } catch (err) {
      console.error("Failed to add classified items:", err);
      setClassifyError("Failed to save expenses to database. Please try again.");
    } finally {
      setIsAddingToExpenses(false);
    }
  }, [classifiedItems, isAddingToExpenses, batchAddExpenses]);

  // ── Weekly Digest State ───────────────────────────────────────────────────
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const digestAbortRef = useRef<AbortController | null>(null);

  const handleGenerateDigest = useCallback(async () => {
    if (expenses.length === 0) return;

    digestAbortRef.current?.abort();
    digestAbortRef.current = new AbortController();

    setIsDigestLoading(true);
    setDigestError(null);

    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses }),
        signal: digestAbortRef.current.signal,
      });

      const data = (await res.json()) as WeeklyDigest & { error?: string };
      if (data.quota) setQuota(data.quota);
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate weekly financial digest.");
      }
      setDigest(data);
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      console.error("Digest error:", err);
      setDigestError(
        err instanceof Error ? err.message : "Failed to compile weekly digest."
      );
    } finally {
      setIsDigestLoading(false);
    }
  }, [expenses]);

  // If initial load is in progress, show standard skeleton
  if (dataLoading) {
    return <PageSkeleton />;
  }

  return (
    <AppShell user={user} onSignOut={signOut}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Top Header & Context Snapshot ─────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                <Sparkles size={16} />
              </span>
              <h1 className="text-xl font-extrabold tracking-tight text-[#0D1B2A] sm:text-2xl">
                AI Financial Intelligence
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="mt-1 text-xs text-[#8BA3B8] sm:text-sm">
              Your real-time financial advisor, habit simulator, smart classifier & weekly analyst.
            </p>
          </div>

          {/* Snapshot Pill Group */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-sm">
              <span className="text-[#8BA3B8]">Logged Spend: </span>
              <span className="font-bold text-[#0D1B2A]">
                {formatINR(coachContext.totalExpenses)}
              </span>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-sm">
              <span className="text-[#8BA3B8]">Entries: </span>
              <span className="font-bold text-sky-600">
                {coachContext.expenseCount}
              </span>
            </div>
            {coachContext.monthlyRecurring > 0 && (
              <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-sm">
                <span className="text-[#8BA3B8]">Monthly Fixed: </span>
                <span className="font-bold text-violet-600">
                  {formatINR(coachContext.monthlyRecurring)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── AI Intelligence Quota Banner ─────────────────────────────── */}
        <div className="mb-6">
          <AIQuotaBadge quota={quota} loading={isQuotaLoading} onRefresh={fetchQuota} />
        </div>

        {/* ── Modern Tabs Navigation ────────────────────────────────────── */}
        <div className="mb-6 flex overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "text-sky-700 shadow-[0_1px_4px_rgb(14_165_233/0.15)]"
                    : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0D1B2A]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeAITab"
                    className="absolute inset-0 rounded-xl bg-sky-50 border border-sky-200/60"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon
                    size={16}
                    className={isActive ? "text-sky-600" : "text-[#94A3B8]"}
                  />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="rounded-full bg-sky-500/10 px-1.5 py-0.2 text-[10px] font-bold text-sky-600">
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: AI Money Coach ─────────────────────────────────────── */}
        {activeTab === "coach" && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col min-h-[580px] max-h-[750px]">
            {/* Coach Sub-header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3.5 bg-[#F8FAFC] rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 text-white shadow-sm">
                  <Bot size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0D1B2A]">
                    PaisaGuide AI Money Coach
                  </h2>
                  <p className="text-[11px] text-[#8BA3B8]">
                    Personalized guidance using your actual logged expenses & Indian financial markets
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AIQuotaBadge quota={quota} compact />
                {isCoachStreaming && (
                  <button
                    onClick={handleStopCoach}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                  >
                    <Square size={12} fill="currentColor" /> Stop
                  </button>
                )}
                {messages.length > 0 && (
                  <button
                    onClick={handleClearCoach}
                    title="Clear Conversation"
                    className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-[#64748B] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="my-auto flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 border border-sky-100">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="text-base font-bold text-[#0D1B2A]">
                    Ask PaisaGuide Anything
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-xs text-[#8BA3B8] sm:text-sm">
                    Ask about a major purchase, find where your money leaks, evaluate opportunity cost, or create a realistic savings plan.
                  </p>

                  {/* Suggestion Chips */}
                  <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
                    {COACH_STARTERS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => handleSendCoach(s.prompt)}
                        className="group flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-sm"
                      >
                        <span className="text-[11px] font-bold text-sky-600 group-hover:text-sky-700">
                          {s.label}
                        </span>
                        <span className="mt-1 text-xs text-[#475569] leading-snug">
                          {s.prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm mt-0.5">
                          <Bot size={15} />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? "bg-sky-500 text-white shadow-[0_2px_8px_rgb(14_165_233/0.25)] rounded-br-sm"
                            : "border border-[#E2E8F0] bg-white text-[#1E293B] shadow-sm rounded-tl-sm whitespace-pre-wrap"
                        }`}
                      >
                        {m.content ? (
                          <>
                            {m.content}
                            {/* Action CTA detected for opportunity cost / purchases */}
                            {!isUser && (m.content.includes("₹") || m.content.toLowerCase().includes("invest")) && (
                              <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
                                <Link
                                  href="/calculator"
                                  className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-600 hover:bg-sky-100 transition"
                                >
                                  <Calculator size={12} /> Model in Calculator <ArrowRight size={11} />
                                </Link>
                                <Link
                                  href="/expenses"
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition"
                                >
                                  <Receipt size={12} /> View Expenses
                                </Link>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 py-1 text-xs text-[#8BA3B8]">
                            <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                            <span>PaisaGuide is analyzing your finances…</span>
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0D1B2A] text-white shadow-sm mt-0.5">
                          <User size={15} />
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}

              {coachError && (
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{coachError}</span>
                  </div>
                  <button
                    onClick={() => handleSendCoach()}
                    className="font-bold underline hover:text-red-800"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="border-t border-[#E2E8F0] p-3 sm:p-4 bg-white rounded-b-2xl">
              <div className="flex items-center gap-2">
                <input
                  id="coach-main-input"
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendCoach();
                    }
                  }}
                  placeholder="Ask a question (e.g., 'Should I buy a ₹50,000 laptop?' or 'How to cut Swiggy spend?')..."
                  className="flex-1 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-2.5 text-xs sm:text-sm text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                />
                <button
                  id="btn-send-coach"
                  onClick={() => handleSendCoach()}
                  disabled={isCoachStreaming || !coachInput.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-[0_2px_8px_rgb(14_165_233/0.3)] transition hover:bg-sky-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  title="Send Message"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#94A3B8] px-1">
                <span>Press Enter to send</span>
                <span className="flex items-center gap-1">
                  <Zap size={11} className="text-amber-500" />
                  Streaming AI response enabled
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: What-If Habit Simulator ────────────────────────────── */}
        {activeTab === "whatif" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A]">
                    Natural Language Habit Simulator
                  </h2>
                  <p className="text-xs text-[#8BA3B8]">
                    Describe any daily or weekly expense habit. AI calculates the true compounding opportunity cost if invested.
                  </p>
                </div>
                <div className="ml-auto">
                  <AIQuotaBadge quota={quota} compact />
                </div>
              </div>

              {/* Presets */}
              <div className="mt-4 mb-4 flex flex-wrap gap-2">
                {WHAT_IF_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleRunWhatIf(preset)}
                    className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#475569] hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <div className="flex gap-2">
                <input
                  id="whatif-query-input"
                  value={whatIfQuery}
                  onChange={(e) => setWhatIfQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRunWhatIf()}
                  placeholder="e.g. What if I stop spending ₹300 on Zomato 3 times a week?"
                  className="flex-1 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs sm:text-sm text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                />
                <button
                  id="btn-run-whatif"
                  onClick={() => handleRunWhatIf()}
                  disabled={isWhatIfLoading || !whatIfQuery.trim()}
                  className="rounded-xl bg-sky-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_2px_8px_rgb(14_165_233/0.25)] hover:bg-sky-600 transition disabled:opacity-40"
                >
                  {isWhatIfLoading ? "Simulating…" : "Run Simulation"}
                </button>
              </div>

              {whatIfError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center justify-between">
                  <span>{whatIfError}</span>
                  <button
                    onClick={() => handleRunWhatIf()}
                    className="font-bold underline hover:text-red-800"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Results Display */}
            {isWhatIfLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-3"
                  >
                    <div className="h-4 w-28 rounded bg-[#E2E8F0]" />
                    <div className="h-7 w-36 rounded bg-[#E2E8F0]" />
                    <div className="h-16 rounded bg-[#F8FAFC]" />
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence>
              {whatIfResult && !isWhatIfLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Parsed Habit Banner */}
                  <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50/50 p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                          Identified Habit
                        </span>
                        <h3 className="text-base font-extrabold text-[#0D1B2A] capitalize">
                          {whatIfResult.parsed.habit}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {whatIfResult.parsed.explanation}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white px-4 py-2 border border-sky-200/60 shadow-sm text-right">
                          <p className="text-[10px] text-[#8BA3B8]">Daily Impact</p>
                          <p className="text-sm font-extrabold text-[#0D1B2A]">
                            ₹{whatIfResult.parsed.dailyAmount}/day
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-500/10 px-4 py-2 border border-emerald-200/60 shadow-sm text-right">
                          <p className="text-[10px] text-emerald-700 font-semibold">Annual Savings</p>
                          <p className="text-sm font-extrabold text-emerald-700">
                            {formatINR(whatIfResult.parsed.dailyAmount * 365)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scenario Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {whatIfResult.projections.map((p) => {
                      const monthlyEquivalent = whatIfResult.parsed.dailyAmount * 30;
                      return (
                        <div
                          key={p.rate}
                          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="text-xs font-extrabold uppercase tracking-wide"
                                style={{ color: p.color }}
                              >
                                {p.label} ({p.rate}%)
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                SIP Mode
                              </span>
                            </div>

                            <p className="text-xs text-[#8BA3B8] mb-4">
                              Redirecting ~{formatINR(monthlyEquivalent)}/month into compounding assets:
                            </p>

                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2 border border-[#F1F5F9]">
                                <span className="text-xs text-[#64748B]">In 5 Years</span>
                                <span className="text-xs font-bold text-[#0D1B2A]">
                                  {formatINRCompact(p.fv5yr)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2 border border-[#F1F5F9]">
                                <span className="text-xs text-[#64748B]">In 10 Years</span>
                                <span className="text-sm font-extrabold text-sky-600">
                                  {formatINRCompact(p.fv10yr)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-3 py-2 border border-emerald-100">
                                <span className="text-xs font-semibold text-emerald-800">In 20 Years</span>
                                <span className="text-sm font-extrabold text-emerald-700">
                                  {formatINRCompact(p.fv20yr)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Link
                            href={`/calculator?amount=${monthlyEquivalent}&rate=${p.rate}`}
                            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
                          >
                            <Calculator size={13} /> Model in Calculator <ArrowRight size={12} />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Tab 3: Smart Expense Classifier ───────────────────────────── */}
        {activeTab === "classify" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0D1B2A]">
                    Smart Text & Receipt Classifier
                  </h2>
                  <p className="text-xs text-[#8BA3B8]">
                    Paste messy text, bank debit SMS, Swiggy bills, or WhatsApp notes. AI extracts structured expenses instantly.
                  </p>
                </div>
                <div className="ml-auto">
                  <AIQuotaBadge quota={quota} compact />
                </div>
              </div>

              {/* Sample presets */}
              <div className="mt-3 mb-3">
                <p className="text-[11px] font-semibold text-[#8BA3B8] mb-1.5">Try an example snippet:</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_RECEIPTS.map((snippet, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleClassify(snippet)}
                      className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] text-[#475569] hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition"
                    >
                      Snippet #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                id="classifier-raw-textarea"
                rows={4}
                value={classifyText}
                onChange={(e) => setClassifyText(e.target.value)}
                placeholder="Paste unformatted expenses here (e.g., 'Swiggy 450, Uber 230, Myntra clothes 1999, Netflix 649, Groceries 1200')..."
                className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3.5 text-xs sm:text-sm text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              />

              <div className="mt-3 flex items-center justify-between">
                <button
                  id="btn-run-classify"
                  onClick={() => handleClassify()}
                  disabled={isClassifyLoading || !classifyText.trim()}
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_2px_8px_rgb(14_165_233/0.25)] hover:bg-sky-600 transition disabled:opacity-40"
                >
                  <Sparkles size={15} />
                  {isClassifyLoading ? "Classifying Expenses…" : "Classify with AI"}
                </button>
                {classifyText && (
                  <button
                    onClick={() => {
                      setClassifyText("");
                      setClassifiedItems([]);
                    }}
                    className="text-xs text-[#8BA3B8] hover:text-[#0D1B2A]"
                  >
                    Clear text
                  </button>
                )}
              </div>

              {classifyError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center justify-between">
                  <span>{classifyError}</span>
                  <button
                    onClick={() => handleClassify()}
                    className="font-bold underline hover:text-red-800"
                  >
                    Retry
                  </button>
                </div>
              )}

              {classifySuccessMessage && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{classifySuccessMessage}</span>
                  </div>
                  <Link
                    href="/expenses"
                    className="font-bold underline text-emerald-800 hover:text-emerald-900"
                  >
                    View in Expenses →
                  </Link>
                </div>
              )}
            </div>

            {/* Classified Results Table / Cards */}
            <AnimatePresence>
              {classifiedItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-[#F1F5F9]">
                    <div>
                      <h3 className="text-sm font-bold text-[#0D1B2A]">
                        Extracted Expenses ({classifiedItems.length} items)
                      </h3>
                      <p className="text-xs text-[#8BA3B8]">
                        Review detected categories and amounts before saving to your tracker
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-sky-50 px-3 py-1.5 border border-sky-100">
                        <span className="text-[11px] text-sky-600">Total: </span>
                        <span className="text-xs font-extrabold text-sky-700">
                          {formatINR(classifiedItems.reduce((acc, curr) => acc + curr.amount, 0))}
                        </span>
                      </div>
                      <button
                        id="btn-batch-add-expenses"
                        onClick={handleAddClassifiedToExpenses}
                        disabled={isAddingToExpenses}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {isAddingToExpenses ? "Saving…" : "+ Add All to Expenses"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {classifiedItems.map((item, idx) => {
                      const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.Other;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 hover:border-sky-200 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                              <Icon size={16} style={{ color: cfg.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-[#0D1B2A]">
                                {item.item}
                              </p>
                              <span className={`text-[10px] font-semibold ${cfg.text}`}>
                                {item.category}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-[#0D1B2A]">
                            {formatINR(item.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Tab 4: Weekly AI Digest ───────────────────────────────────── */}
        {activeTab === "digest" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0D1B2A]">
                      Weekly Spending AI Digest
                    </h2>
                    <p className="text-xs text-[#8BA3B8]">
                      Synthesizes your weekly expense trends, identifies anomalies, and generates 3 high-impact recommendations.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-generate-digest-main"
                  onClick={handleGenerateDigest}
                  disabled={isDigestLoading || expenses.length === 0}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-sky-600 transition disabled:opacity-40"
                >
                  <RotateCcw size={14} className={isDigestLoading ? "animate-spin" : ""} />
                  {isDigestLoading ? "Generating Digest…" : digest ? "Refresh Digest" : "Generate Digest"}
                </button>
              </div>

              {digestError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center justify-between">
                  <span>{digestError}</span>
                  <button
                    onClick={handleGenerateDigest}
                    className="font-bold underline hover:text-red-800"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Digest Content */}
            {isDigestLoading && (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-4 animate-pulse">
                <div className="h-6 w-48 rounded bg-[#E2E8F0]" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="h-20 rounded-xl bg-[#F8FAFC]" />
                  <div className="h-20 rounded-xl bg-[#F8FAFC]" />
                  <div className="h-20 rounded-xl bg-[#F8FAFC]" />
                </div>
                <div className="h-24 rounded-xl bg-[#F8FAFC]" />
              </div>
            )}

            {!digest && !isDigestLoading && expenses.length === 0 && (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white py-12 text-center shadow-sm">
                <Receipt size={32} className="mx-auto mb-2 text-[#CBD5E1]" />
                <p className="font-bold text-[#0D1B2A]">No expenses logged yet</p>
                <p className="mt-1 text-xs text-[#8BA3B8]">
                  Log expenses to enable automated weekly digest insights.
                </p>
                <Link
                  href="/expenses"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600"
                >
                  Go to Expenses
                </Link>
              </div>
            )}

            {!digest && !isDigestLoading && expenses.length > 0 && (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white py-12 text-center shadow-sm">
                <Sparkles size={32} className="mx-auto mb-2 text-sky-400" />
                <p className="font-bold text-[#0D1B2A]">Ready to Generate Weekly Analysis</p>
                <p className="mt-1 text-xs text-[#8BA3B8] max-w-sm mx-auto">
                  Click generate above to run a comprehensive spending audit across your {expenses.length} logged expenses.
                </p>
              </div>
            )}

            <AnimatePresence>
              {digest && !isDigestLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Summary Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                      <p className="text-xs text-[#8BA3B8]">Week Period</p>
                      <p className="text-base font-extrabold text-[#0D1B2A] mt-0.5">
                        {digest.weekLabel}
                      </p>
                      <span className="inline-block mt-2 text-[10px] text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded-full">
                        Rolling 7-day window
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                      <p className="text-xs text-[#8BA3B8]">Total Spent</p>
                      <p className="text-xl font-extrabold text-[#0D1B2A] mt-0.5">
                        {formatINR(digest.totalSpent)}
                      </p>
                      {digest.spendingChange !== null && (
                        <p
                          className={`mt-2 text-[11px] font-bold ${
                            digest.spendingChange > 0 ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {digest.spendingChange > 0 ? "▲" : "▼"} {Math.abs(digest.spendingChange)}% vs prior week
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                      <p className="text-xs text-[#8BA3B8]">Savings Progress</p>
                      <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 mt-1">
                        {digest.savingsProgress}
                      </p>
                    </div>
                  </div>

                  {/* Top Spending Categories */}
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#8BA3B8] mb-3">
                      Top Expense Drivers This Week
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {digest.topCategories.map((c) => (
                        <div
                          key={c.category}
                          className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{c.icon}</span>
                            <span className="text-xs font-semibold text-[#0D1B2A]">{c.category}</span>
                          </div>
                          <span className="text-xs font-extrabold text-[#0D1B2A]">
                            {formatINR(c.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Unusual Spending Alert (if any) */}
                  {digest.unusualSpending && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-800">
                          Unusual Spending Pattern Detected
                        </p>
                        <p className="mt-0.5 text-xs text-amber-900 leading-relaxed">
                          {digest.unusualSpending}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 3 AI Recommendations */}
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={16} className="text-sky-500" />
                      <h3 className="text-sm font-bold text-[#0D1B2A]">
                        3 Tailored AI Recommendations
                      </h3>
                    </div>

                    <div className="space-y-2.5">
                      {digest.insights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] p-3"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-extrabold text-sky-700">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-[#334155] leading-relaxed">
                            {insight}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}

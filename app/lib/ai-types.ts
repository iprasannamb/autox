/**
 * ai-types.ts — Shared TypeScript interfaces for all AI features.
 * Used by both API route handlers and client components.
 */

// ── AI Quota Tracking ─────────────────────────────────────────────────────────

export interface AIQuota {
  limit: number;
  used: number;
  remaining: number;
  percent: number;
  resetsAt: string; // ISO string
  resetHours: number;
  model: string;
  status: "healthy" | "low" | "exhausted" | "offline_mode";
  isFallback: boolean;
}

// ── Smart Expense Classification ──────────────────────────────────────────────

export interface ClassifiedExpense {
  item: string;
  amount: number;
  category: string;
}

export interface ClassifyExpensesResponse {
  expenses: ClassifiedExpense[];
  quota?: AIQuota;
  notice?: string;
}

// ── AI Money Coach ────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
}

export interface CoachContext {
  totalExpenses: number;
  expenseCount: number;
  topCategories: { category: string; total: number }[];
  monthlyRecurring: number;
}

export interface CoachRequest {
  message: string;
  history: { role: ChatRole; content: string }[];
  context: CoachContext;
  stream?: boolean;
}

export interface CoachResponse {
  reply: string;
  quota?: AIQuota;
  notice?: string;
}

// ── Natural Language What-If ──────────────────────────────────────────────────

export interface WhatIfParsed {
  habit: string;
  dailyAmount: number;
  explanation: string;
}

export interface WhatIfProjection {
  rate: number; // e.g. 8, 12, 15
  label: string; // "Conservative", "Moderate", "Aggressive"
  color: string;
  annualSavings: number;
  fv5yr: number;
  fv10yr: number;
  fv20yr: number;
}

export interface WhatIfResponse {
  parsed: WhatIfParsed;
  projections: WhatIfProjection[];
  quota?: AIQuota;
  notice?: string;
}

// ── Weekly AI Digest ──────────────────────────────────────────────────────────

export interface WeeklyDigest {
  weekLabel: string; // e.g. "Sep 22 – Sep 28"
  totalSpent: number;
  topCategories: { category: string; total: number; icon: string }[];
  spendingChange: number | null; // percent vs prev week, null if not enough data
  unusualSpending: string | null;
  savingsProgress: string;
  insights: string[]; // exactly 3 concise insights
  generatedAt: string; // ISO timestamp
  quota?: AIQuota;
  notice?: string;
}


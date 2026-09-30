/**
 * constants.ts — Shared constants, category configuration, demo data, and helpers.
 * Used across Dashboard, Expenses, Budget, Calculator, and AI pages.
 */

import {
  Utensils, Car, ShoppingBag, Monitor, Heart, BookOpen, Zap, Plane, Package,
} from "lucide-react";
import { futureValue, futureValueRecurring } from "./finance";
import type { Expense } from "./types";

// ── Category visual configuration ─────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  text: string;
  chart: string;
  border: string;
}> = {
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

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);

// ── Category keyword auto-detection ───────────────────────────────────────────

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food:          ["food","restaurant","cafe","coffee","lunch","dinner","breakfast","swiggy","zomato","pizza","burger","meal","snack","chai","biryani"],
  Transport:     ["uber","ola","petrol","fuel","auto","bus","metro","train","taxi","cab","rapido","rickshaw"],
  Shopping:      ["amazon","flipkart","clothes","shirt","dress","bag","mall","myntra","shop","meesho","blinkit","zepto"],
  Entertainment: ["movie","netflix","prime","spotify","concert","game","hotstar","youtube","pvr","inox","disney"],
  Health:        ["medicine","doctor","hospital","pharmacy","gym","fitness","yoga","dental","clinic","apollo"],
  Education:     ["course","book","udemy","coaching","fees","school","college","learning","class"],
  Bills:         ["electricity","water","internet","phone","rent","gas","insurance","emi","subscription","bill","recharge","jio","airtel"],
  Travel:        ["flight","hotel","trip","travel","holiday","vacation","booking","airbnb","oyo","irctc"],
};

export function autoCategory(description: string): string {
  const lower = description.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return cat;
  }
  return "Other";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Returns date context (e.g. "Today", "Yesterday", "4 days ago")
 */
export function getDateContextLabel(dateIso: string): { label: string; isPast: boolean; daysAgo: number } {
  const today = todayISO();
  if (dateIso === today) {
    return { label: "Today", isPast: false, daysAgo: 0 };
  }

  const dToday = new Date(today + "T00:00:00");
  const dExpense = new Date(dateIso + "T00:00:00");
  const diffTime = dToday.getTime() - dExpense.getTime();
  const daysAgo = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysAgo === 1) {
    return { label: "Yesterday", isPast: true, daysAgo: 1 };
  }
  if (daysAgo > 1) {
    return { label: `${daysAgo} days ago (missed)`, isPast: true, daysAgo };
  }
  return { label: "Future date", isPast: false, daysAgo };
}

/**
 * Calculates monthly equivalent amount for any recurring frequency (daily, weekly, monthly, yearly)
 */
export function getMonthlyRecurringAmount(e: { amount: number; is_recurring?: boolean; recurring_frequency?: "daily" | "weekly" | "monthly" | "yearly" | null }): number {
  if (!e.is_recurring) return 0;
  switch (e.recurring_frequency) {
    case "daily":
      return e.amount * 30;
    case "weekly":
      return e.amount * (52 / 12);
    case "monthly":
      return e.amount;
    case "yearly":
      return e.amount / 12;
    default:
      return e.amount;
  }
}

export function getExpenseFV(e: Expense, ratePercent: number, years: number): number {
  const r = ratePercent / 100;
  if (e.is_recurring) {
    const monthlyAmt = getMonthlyRecurringAmount(e);
    return futureValueRecurring(monthlyAmt, r, years);
  }
  return futureValue(e.amount, r, years);
}

// ── NewExpense type (for creating) ────────────────────────────────────────────

export type NewExpense = Omit<Expense, "id" | "user_id" | "created_at">;

/**
 * Generates recurring expense occurrences from expense_date up to untilDate (today).
 * Correctly increments daily, weekly, monthly, or yearly.
 */
export function expandRecurringOccurrences(base: NewExpense, untilDate: Date = new Date()): NewExpense[] {
  if (!base.is_recurring || !base.recurring_frequency) {
    return [base];
  }

  const occurrences: NewExpense[] = [];
  const start = new Date(base.expense_date + "T00:00:00");
  const end = new Date(untilDate.toISOString().split("T")[0] + "T00:00:00");

  if (start >= end) {
    return [base];
  }

  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    occurrences.push({
      ...base,
      expense_date: dateStr,
    });

    if (base.recurring_frequency === "daily") {
      current.setDate(current.getDate() + 1);
    } else if (base.recurring_frequency === "weekly") {
      current.setDate(current.getDate() + 7);
    } else if (base.recurring_frequency === "monthly") {
      current.setMonth(current.getMonth() + 1);
    } else if (base.recurring_frequency === "yearly") {
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  return occurrences.length > 0 ? occurrences : [base];
}

// ── Demo data ─────────────────────────────────────────────────────────────────

export const DEMO_USER = {
  id: "demo-user-1",
  email: "priya.sharma@autox.fi",
  name: "Priya Sharma",
};

export const DEMO_EXPENSES: Expense[] = (() => {
  const today = new Date();
  const d = (daysAgo: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString().split("T")[0];
  };
  const iso = today.toISOString();

  return [
    { id: "exp-1", user_id: "demo-user-1", amount: 680,  description: "Swiggy Gourmet Dinner",       category: "Food",          expense_date: d(0), notes: null, is_recurring: false, recurring_frequency: null,      created_at: iso },
    { id: "exp-2", user_id: "demo-user-1", amount: 240,  description: "Blue Tokai Cold Brew",         category: "Food",          expense_date: d(0), notes: null, is_recurring: false, recurring_frequency: null,      created_at: iso },
    { id: "exp-3", user_id: "demo-user-1", amount: 420,  description: "Uber Premier to Tech Park",    category: "Transport",     expense_date: d(1), notes: null, is_recurring: false, recurring_frequency: null,      created_at: iso },
    { id: "exp-4", user_id: "demo-user-1", amount: 2499, description: "Myntra Autumn Collection",     category: "Shopping",      expense_date: d(2), notes: null, is_recurring: false, recurring_frequency: null,      created_at: iso },
    { id: "exp-5", user_id: "demo-user-1", amount: 649,  description: "Netflix 4K Premium Plan",      category: "Entertainment", expense_date: d(3), notes: null, is_recurring: true,  recurring_frequency: "monthly", created_at: iso },
    { id: "exp-6", user_id: "demo-user-1", amount: 2200, description: "Tata Power Electricity Bill",  category: "Bills",         expense_date: d(4), notes: null, is_recurring: true,  recurring_frequency: "monthly", created_at: iso },
    { id: "exp-7", user_id: "demo-user-1", amount: 1450, description: "Cult.fit Elite Yoga & Gym",    category: "Health",        expense_date: d(5), notes: null, is_recurring: true,  recurring_frequency: "monthly", created_at: iso },
    { id: "exp-8", user_id: "demo-user-1", amount: 5000, description: "Nifty 50 Index SIP",           category: "Other",         expense_date: d(6), notes: null, is_recurring: true,  recurring_frequency: "monthly", created_at: iso },
    { id: "exp-9", user_id: "demo-user-1", amount: 350,  description: "Rapido Bike Taxi",             category: "Transport",     expense_date: d(1), notes: null, is_recurring: false, recurring_frequency: null,      created_at: iso },
    { id: "exp-10", user_id: "demo-user-1", amount: 1299, description: "Udemy React Course",          category: "Education",     expense_date: d(7), notes: null, is_recurring: false, recurring_frequency: null,      created_at: iso },
    { id: "exp-11", user_id: "demo-user-1", amount: 890,  description: "Apollo Pharmacy Vitamins",    category: "Health",        expense_date: d(3), notes: null, is_recurring: false, recurring_frequency: null,      created_at: iso },
    { id: "exp-12", user_id: "demo-user-1", amount: 499,  description: "Spotify Premium Annual",      category: "Entertainment", expense_date: d(8), notes: null, is_recurring: true,  recurring_frequency: "monthly", created_at: iso },
  ];
})();

// ── Default budget configuration ──────────────────────────────────────────────

export const DEFAULT_BUDGETS: Record<string, number> = {
  Food: 8000,
  Transport: 5000,
  Shopping: 6000,
  Entertainment: 3000,
  Health: 4000,
  Education: 3000,
  Bills: 8000,
  Travel: 5000,
  Other: 3000,
};

export const DEFAULT_MONTHLY_BUDGET = 50000;

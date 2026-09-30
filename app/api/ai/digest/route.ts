/**
 * POST /api/ai/digest
 * Weekly AI Digest — generates a summary card from expense data.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/app/lib/gemini";
import type { WeeklyDigest } from "@/app/lib/ai-types";
import type { Expense } from "@/app/lib/types";

const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍔", Transport: "🚗", Shopping: "🛍️", Entertainment: "🎬",
  Health: "💊", Education: "📚", Bills: "💡", Travel: "✈️", Other: "📦",
};

function isWeeklyDigest(data: unknown): data is WeeklyDigest {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.weekLabel === "string" &&
    typeof d.totalSpent === "number" &&
    Array.isArray(d.topCategories) &&
    Array.isArray(d.insights) &&
    d.insights.length === 3 &&
    typeof d.savingsProgress === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const { expenses } = (await request.json()) as { expenses?: Expense[] };
    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: "No expense data provided." }, { status: 400 });
    }

    // Compute week bounds (last 7 days)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);

    const fmt = (d: Date) =>
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    const weekLabel = `${fmt(weekStart)} – ${fmt(now)}`;

    // Filter this week's expenses
    const thisWeek = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d >= weekStart && d <= now;
    });

    // Build category totals
    const catMap: Record<string, number> = {};
    let totalSpent = 0;
    for (const e of thisWeek) {
      catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
      totalSpent += e.amount;
    }

    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, total]) => ({
        category,
        total: Math.round(total),
        icon: CATEGORY_ICONS[category] ?? "📦",
      }));

    // Compare to previous week
    const prevStart = new Date(weekStart);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevWeek = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d >= prevStart && d < weekStart;
    });
    const prevTotal = prevWeek.reduce((s, e) => s + e.amount, 0);
    const spendingChange =
      prevTotal > 0 ? Math.round(((totalSpent - prevTotal) / prevTotal) * 100) : null;

    // Recurring monthly total
    const recurring = expenses
      .filter((e) => e.is_recurring && e.recurring_frequency === "monthly")
      .reduce((s, e) => s + e.amount, 0);

    // Build summary for Gemini
    const summaryData = {
      weekLabel,
      totalSpent: Math.round(totalSpent),
      topCategories,
      spendingChange,
      expenseCount: thisWeek.length,
      monthlyRecurring: Math.round(recurring),
      prevWeekTotal: Math.round(prevTotal),
      allCategories: Object.entries(catMap).map(([c, t]) => ({ c, t: Math.round(t) })),
    };

    const prompt = `You are autoX's AI financial analyst. Generate a weekly spending digest for an Indian user.

Here is their spending data:
${JSON.stringify(summaryData, null, 2)}

Return ONLY valid JSON in this exact shape:
{
  "weekLabel": "${weekLabel}",
  "totalSpent": ${summaryData.totalSpent},
  "topCategories": ${JSON.stringify(topCategories)},
  "spendingChange": ${spendingChange},
  "unusualSpending": "one sentence about any unusual/high spending, or null if nothing notable",
  "savingsProgress": "one encouraging sentence about their financial health based on the data",
  "insights": [
    "insight 1 — specific, data-driven, actionable (max 15 words)",
    "insight 2 — specific, data-driven, actionable (max 15 words)",
    "insight 3 — specific, data-driven, actionable (max 15 words)"
  ],
  "generatedAt": "${new Date().toISOString()}"
}

Rules:
- insights must be exactly 3, concise, and reference actual numbers from the data
- unusualSpending should be null if nothing stands out
- use ₹ for currency
- be encouraging, not preachy`;

    const digest = await generateJSON<WeeklyDigest>(prompt, isWeeklyDigest);
    return NextResponse.json(digest);
  } catch (err) {
    console.error("[digest]", err);
    return NextResponse.json(
      { error: "Failed to generate digest. Please try again." },
      { status: 500 }
    );
  }
}

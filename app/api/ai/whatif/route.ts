/**
 * POST /api/ai/whatif
 * Natural Language What-If — Gemini parses the habit, app logic computes projections.
 * Includes AI quota tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/app/lib/gemini";
import { recordQuotaUsage, attachQuotaCookie } from "@/app/lib/ai-quota";
import type { WhatIfParsed, WhatIfResponse } from "@/app/lib/ai-types";

const SCENARIOS = [
  { rate: 8, label: "Conservative", color: "#6366f1" },
  { rate: 12, label: "Moderate", color: "#22d3ee" },
  { rate: 15, label: "Aggressive", color: "#34d399" },
] as const;

function isWhatIfParsed(data: unknown): data is WhatIfParsed {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.habit === "string" &&
    typeof d.dailyAmount === "number" &&
    typeof d.explanation === "string"
  );
}

function futureValueRecurring(monthlyPmt: number, annualRate: number, years: number): number {
  if (monthlyPmt <= 0 || annualRate <= 0 || years <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return monthlyPmt * ((Math.pow(1 + r, n) - 1) / r);
}

export async function POST(request: NextRequest) {
  const quota = recordQuotaUsage(request);

  try {
    const { query } = (await request.json()) as { query?: string };
    if (!query || query.trim().length === 0) {
      const response = NextResponse.json({ error: "No query provided.", quota }, { status: 400 });
      return attachQuotaCookie(response, quota);
    }

    const prompt = `You are a financial habit parser for Indian users.
The user asked a what-if question about a spending habit.

User query: "${query.slice(0, 500)}"

Extract the daily spending amount (in INR) from this query and describe the habit concisely.
If the user mentions a weekly or monthly amount, convert it to a daily equivalent.
If no amount is mentioned, make a reasonable assumption for the described habit.

Return ONLY valid JSON in this exact shape:
{
  "habit": "brief description of the habit (e.g., 'daily coffee')",
  "dailyAmount": <number in INR>,
  "explanation": "one sentence explaining what you parsed and any assumptions made"
}`;

    const parsed = await generateJSON<WhatIfParsed>(prompt, isWhatIfParsed);

    const annualSavings = parsed.dailyAmount * 365;
    const monthlyAmount = parsed.dailyAmount * 30;

    const projections = SCENARIOS.map((s) => ({
      rate: s.rate,
      label: s.label,
      color: s.color,
      annualSavings,
      fv5yr: futureValueRecurring(monthlyAmount, s.rate, 5),
      fv10yr: futureValueRecurring(monthlyAmount, s.rate, 10),
      fv20yr: futureValueRecurring(monthlyAmount, s.rate, 20),
    }));

    const result: WhatIfResponse = { parsed, projections, quota };
    const response = NextResponse.json(result);
    return attachQuotaCookie(response, quota);
  } catch (err) {
    console.error("[whatif]", err);
    const response = NextResponse.json(
      { error: "Failed to process your what-if query. Please try again.", quota },
      { status: 500 }
    );
    return attachQuotaCookie(response, quota);
  }
}

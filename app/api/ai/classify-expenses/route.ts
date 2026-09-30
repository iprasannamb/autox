/**
 * POST /api/ai/classify-expenses
 * Accepts messy text input and returns structured classified expenses via Gemini.
 * Includes AI quota tracking and failsafe offline heuristic recovery.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateJSON, parseMessyExpenses } from "@/app/lib/gemini";
import { recordQuotaUsage, attachQuotaCookie } from "@/app/lib/ai-quota";
import type { ClassifyExpensesResponse } from "@/app/lib/ai-types";

function isClassifyResponse(data: unknown): data is ClassifyExpensesResponse {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.expenses)) return false;
  return d.expenses.every(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as Record<string, unknown>).item === "string" &&
      typeof (e as Record<string, unknown>).amount === "number" &&
      typeof (e as Record<string, unknown>).category === "string"
  );
}

export async function POST(request: NextRequest) {
  let quota = recordQuotaUsage(request);

  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text ?? "";

    if (!text || text.trim().length === 0) {
      const response = NextResponse.json({ error: "No text provided.", quota }, { status: 400 });
      return attachQuotaCookie(response, quota);
    }

    // If quota is exhausted, use fast local heuristic parsing immediately
    if (quota.status === "exhausted") {
      const heuristicExpenses = parseMessyExpenses(text);
      const response = NextResponse.json({
        expenses: heuristicExpenses,
        quota,
        notice: "Daily Gemini API limit reached (25/25). Processed instantly via autoX Smart Heuristic Engine.",
      });
      return attachQuotaCookie(response, quota);
    }

    const prompt = `You are a financial expense classifier for Indian users.
Parse the following messy text and extract each expense item.
For each item, identify: item name, amount in INR (number only), and category.

Valid categories: Food, Transport, Shopping, Entertainment, Health, Education, Bills, Travel, Other

Input text: "${text.slice(0, 1000)}"

Return ONLY valid JSON in this exact shape:
{
  "expenses": [
    { "item": "string", "amount": number, "category": "string" }
  ]
}

Rules:
- amount must be a positive number (no currency symbols)
- if an item mentions a popular Indian app/brand, infer its category (e.g. Swiggy = Food, Uber = Transport)
- if no amount is specified, use 0
- return an empty array if nothing recognizable is found`;

    try {
      const result = await generateJSON<ClassifyExpensesResponse>(prompt, isClassifyResponse);
      const response = NextResponse.json({
        expenses: result.expenses ?? [],
        quota,
      });
      return attachQuotaCookie(response, quota);
    } catch (genErr) {
      console.warn("[classify-expenses] Model generation failed, running resilient heuristic parser", genErr);
      const fallbackExpenses = parseMessyExpenses(text);
      const response = NextResponse.json({
        expenses: fallbackExpenses,
        quota: { ...quota, isFallback: true },
        notice: "Processed via autoX Smart Offline Parser.",
      });
      return attachQuotaCookie(response, quota);
    }
  } catch (err) {
    console.error("[classify-expenses fatal]", err);
    // Even on fatal request error, provide empty array rather than blocking user
    const response = NextResponse.json(
      {
        expenses: [],
        quota,
        error: "Failed to parse input. Please try entering something like 'Swiggy 450, Uber 230'.",
      },
      { status: 200 } // Return 200 with error info so UI handles it gracefully
    );
    return attachQuotaCookie(response, quota);
  }
}

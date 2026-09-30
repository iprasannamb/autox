/**
 * POST /api/ai/classify-expenses
 * Accepts messy text input and returns structured classified expenses via Gemini.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/app/lib/gemini";
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
  try {
    const { text } = (await request.json()) as { text?: string };
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
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

    const result = await generateJSON<ClassifyExpensesResponse>(prompt, isClassifyResponse);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[classify-expenses]", err);
    return NextResponse.json(
      { error: "Failed to classify expenses. Please try again." },
      { status: 500 }
    );
  }
}

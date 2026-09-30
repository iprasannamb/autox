/**
 * POST /api/ai/coach
 * AI Money Coach — multi-turn chat with user financial context.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateChat } from "@/app/lib/gemini";
import type { CoachRequest } from "@/app/lib/ai-types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CoachRequest>;
    const { message, history = [], context } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "No message provided." }, { status: 400 });
    }

    const contextBlock = context
      ? `User's financial snapshot:
- Total expenses logged: ₹${context.totalExpenses.toLocaleString("en-IN")} across ${context.expenseCount} entries
- Monthly recurring expenses: ₹${context.monthlyRecurring.toLocaleString("en-IN")}
- Top spending categories: ${context.topCategories.map((c) => `${c.category} (₹${c.total.toLocaleString("en-IN")})`).join(", ")}`
      : "No financial data available for this user yet.";

    const systemInstruction = `You are autoX's AI Money Coach — a practical, honest, and empathetic financial advisor for Indian users.

${contextBlock}

Your role:
1. Give concrete, numbers-based advice using the user's actual data above.
2. Never give vague generic advice — always reference specific numbers.
3. If the user asks about a purchase (e.g. "Should I buy X?"), show the opportunity cost: what that money could grow to if invested at 8%, 12%, and 15% over 5, 10, 20 years.
4. Be concise — 2-4 short paragraphs maximum.
5. Use Indian currency (₹) and Indian context (SIP, mutual funds, NIFTY 50, etc.).
6. Be supportive but honest. Don't preach.
7. End with one actionable suggestion.`;

    // Convert history to Gemini format
    const geminiHistory = history.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

    const reply = await generateChat(systemInstruction, geminiHistory, message.trim());
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[coach]", err);
    return NextResponse.json(
      { error: "The AI coach is unavailable right now. Please try again." },
      { status: 500 }
    );
  }
}

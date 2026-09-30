/**
 * POST /api/ai/coach
 * AI Money Coach — multi-turn chat with user financial context.
 * Includes AI quota tracking.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateChat, generateChatStream } from "@/app/lib/gemini";
import { recordQuotaUsage, attachQuotaCookie } from "@/app/lib/ai-quota";
import type { CoachRequest } from "@/app/lib/ai-types";

export async function POST(request: NextRequest) {
  const quota = recordQuotaUsage(request);

  try {
    const body = (await request.json()) as Partial<CoachRequest>;
    const { message, history = [], context, stream = false } = body;

    if (!message || message.trim().length === 0) {
      const response = NextResponse.json({ error: "No message provided.", quota }, { status: 400 });
      return attachQuotaCookie(response, quota);
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

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generateChatStream(systemInstruction, geminiHistory, message.trim())) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-AI-Quota-Remaining": String(quota.remaining),
        },
      });
    }

    const reply = await generateChat(systemInstruction, geminiHistory, message.trim());
    const response = NextResponse.json({ reply, quota });
    return attachQuotaCookie(response, quota);
  } catch (err) {
    console.error("[coach]", err);
    const response = NextResponse.json(
      { error: "The AI coach is unavailable right now. Please try again.", quota },
      { status: 500 }
    );
    return attachQuotaCookie(response, quota);
  }
}

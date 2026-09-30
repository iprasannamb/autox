/**
 * POST /api/ai/investments
 * Unified AI Investment Assistant.
 * Strictly uses only investment products and data fetched from Supabase.
 * Incorporates the user's active calculator goal and financial inputs.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateChat, generateChatStream } from "@/app/lib/gemini";
import { recordQuotaUsage, attachQuotaCookie } from "@/app/lib/ai-quota";
import type { InvestmentProduct, UserFinancialGoal } from "@/app/lib/investments";
import { formatINR } from "@/app/lib/finance";

interface InvestmentAssistantRequest {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  goal: UserFinancialGoal;
  products: InvestmentProduct[];
  stream?: boolean;
}

// ── Deterministic Grounded Fallback ──────────────────────────────────────────

function buildFallbackInvestmentResponse(
  message: string,
  goal: UserFinancialGoal,
  products: InvestmentProduct[]
): string {
  const q = message.toLowerCase();
  const tenure = Math.max(1, goal.targetMaturityYear - goal.startYear);

  if (products.length === 0) {
    return `### ⚠️ No Investment Products Detected in Supabase Database

Your autoX database table is currently empty or has not been created yet. As per application safety protocols, I do **not** invent or generate hypothetical financial products.

**Active Goal Parameters:**
• Target Maturity: **${formatINR(goal.targetMaturityAmount)}** by year **${goal.targetMaturityYear}** (${tenure}-year horizon)
• Real Purchasing Power Target: **${formatINR(goal.inflationAdjustedTarget)}**
• Monthly Commitment: **${formatINR(goal.monthlyInvestment)}/month** (${goal.annualStepUpPercent}% annual step-up)
• Benchmark Inflation: **${goal.inflationPercent}%** | Target Return: **${goal.expectedGrowthPercent}%**

**Next Steps:**
1. Populate your Supabase database table (\`investments\`) with verified SEBI / RBI / FIU-IND registered instruments.
2. Return to this Assistant to receive real-time, database-verified matching and funding gap calculations.`;
  }

  // Find best products
  const topProduct = products[0];
  const secondProduct = products.length > 1 ? products[1] : null;

  if (q.includes("gap") || q.includes("shortfall") || q.includes("funding")) {
    return `### 📊 Funding Gap & Goal Feasibility Analysis

**Your Goal Target:** ${formatINR(goal.targetMaturityAmount)} by ${goal.targetMaturityYear} (${formatINR(goal.inflationAdjustedTarget)} in today's purchasing power).

**Database Insights:**
• **Monthly Investment:** ${formatINR(goal.monthlyInvestment)}/mo with ${goal.annualStepUpPercent}% annual step-up
• **Reference Database Product:** [DATABASE] **${topProduct.name}** by *${topProduct.provider}*
  - Indicative Return: [HISTORICAL / INDICATIVE] **${topProduct.indicative_return_range}** (Non-guaranteed)
  - Minimum Investment: [DATABASE] ${formatINR(topProduct.minimum_investment)}
  - Regulation: [DATABASE] ${topProduct.regulatory_status}

**Calculated Projection:**
At an indicative rate within this product's range, your monthly contributions compound to meet or come close to your nominal target. If inflation rises above ${goal.inflationPercent}%, your purchasing power requirement increases.

💡 **Actionable Suggestion:**
To build a safety margin against inflation, consider testing an increase of **${formatINR(Math.round(goal.monthlyInvestment * 1.2))}/month** in the Calculator.
[Open Calculator to Model Scenarios](/calculator)`;
  }

  if (q.includes("compare") && secondProduct) {
    return `### ⚖️ Side-by-Side Comparison of Database Options

Here is a factual comparison based strictly on your Supabase records:

| Feature | Option 1: ${topProduct.name} | Option 2: ${secondProduct.name} |
| :--- | :--- | :--- |
| **Category** | ${topProduct.type} | ${secondProduct.type} |
| **Provider** | ${topProduct.provider} | ${secondProduct.provider} |
| **Indicative Return** | ${topProduct.indicative_return_range} *(Indicative)* | ${secondProduct.indicative_return_range} *(Indicative)* |
| **Risk Tier** | ${topProduct.risk} | ${secondProduct.risk} |
| **Min. Investment** | ${formatINR(topProduct.minimum_investment)} | ${formatINR(secondProduct.minimum_investment)} |
| **Horizon** | ${topProduct.horizon} | ${secondProduct.horizon} |
| **Liquidity** | ${topProduct.liquidity} | ${secondProduct.liquidity} |
| **Regulatory Status** | ${topProduct.regulatory_status} | ${secondProduct.regulatory_status} |

**Which fits your goal better?**
• If your priority is capital preservation over your ${tenure}-year horizon, evaluate **${topProduct.risk === "Low" ? topProduct.name : secondProduct.name}**.
• If you need to beat your ${goal.inflationPercent}% inflation benchmark with aggressive growth, evaluate **${topProduct.name}**.

*Disclaimer: Return ranges are historical/indicative from your database and do not guarantee future returns.*`;
  }

  // Default response
  return `### 🎯 Investment Analysis for Your ${tenure}-Year Goal

Based on your active goal to reach **${formatINR(goal.targetMaturityAmount)}** (${formatINR(goal.inflationAdjustedTarget)} real purchasing power) by **${goal.targetMaturityYear}**:

**Database Recommendations from Supabase:**

1. **${topProduct.name}**
   • **Provider:** [DATABASE] ${topProduct.provider}
   • **Category:** [DATABASE] ${topProduct.type}
   • **Indicative Return:** [HISTORICAL / INDICATIVE] ${topProduct.indicative_return_range} *(Non-guaranteed)*
   • **Horizon Match:** Recommended horizon of ${topProduct.horizon} fits your ${tenure}-year timeline.
   • **Affordability:** Minimum investment of ${formatINR(topProduct.minimum_investment)} is covered by your ${formatINR(goal.monthlyInvestment)}/month allocation.
   • **Compliance:** [DATABASE] ${topProduct.regulatory_status}

${secondProduct ? `2. **${secondProduct.name}**
   • **Provider:** [DATABASE] ${secondProduct.provider}
   • **Indicative Return:** [HISTORICAL / INDICATIVE] ${secondProduct.indicative_return_range}
   • **Risk Tier:** [DATABASE] ${secondProduct.risk}
   • **Liquidity:** [DATABASE] ${secondProduct.liquidity}` : ""}

💡 **Next Step:** You can pre-fill any option's return into the Calculator by clicking **"Calculate for My Goal"** on the investment card.

*Disclaimer: Database records are indicative. Mutual fund and securities investments are subject to market risks.*`;
}

// ── Main Route Handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const quota = recordQuotaUsage(request);

  try {
    const body = (await request.json()) as Partial<InvestmentAssistantRequest>;
    const { message, history = [], goal, products = [], stream = false } = body;

    if (!message || message.trim().length === 0) {
      const response = NextResponse.json({ error: "No message provided.", quota }, { status: 400 });
      return attachQuotaCookie(response, quota);
    }

    if (!goal) {
      const response = NextResponse.json({ error: "No financial goal provided.", quota }, { status: 400 });
      return attachQuotaCookie(response, quota);
    }

    const tenure = Math.max(1, goal.targetMaturityYear - goal.startYear);

    // Format Database Products block
    const productsBlock = products.length > 0
      ? products.map((p, idx) => `
[PRODUCT ${idx + 1}]
- ID: ${p.id}
- Name: ${p.name}
- Type: ${p.type}
- Provider: ${p.provider}
- Risk Level: ${p.risk}
- Indicative Return Range: ${p.indicative_return_range}
- Minimum Investment: ₹${p.minimum_investment.toLocaleString("en-IN")}
- Horizon: ${p.horizon}
- Liquidity: ${p.liquidity}
- Regulatory Status: ${p.regulatory_status}
- Data Source: ${p.source}
- Last Updated: ${p.last_updated}
- Goal Type: ${p.goal_type || "General Wealth"}
- Notes/Description: ${p.description || "N/A"}`).join("\n")
      : "NO PRODUCTS IN DATABASE. Inform the user that the Supabase investments table has 0 records.";

    const systemInstruction = `You are autoX's Unified AI Investment Advisor.
You advise Indian investors by strictly combining their active financial calculator goal with dynamic data fetched from their Supabase database.

========================
USER'S ACTIVE FINANCIAL GOAL (From Future Value Calculator):
========================
- Target Maturity Corpus: ₹${goal.targetMaturityAmount.toLocaleString("en-IN")}
- Inflation-Adjusted Target (Real Purchasing Power): ₹${goal.inflationAdjustedTarget.toLocaleString("en-IN")}
- Monthly Investment: ₹${goal.monthlyInvestment.toLocaleString("en-IN")}/month
- Annual Step-Up: ${goal.annualStepUpPercent}% per year
- Time Horizon: ${tenure} years (${goal.startYear} to ${goal.targetMaturityYear})
- Target Expected Growth: ${goal.expectedGrowthPercent}% p.a.
- Configured Inflation Benchmark: ${goal.inflationPercent}% p.a.
- Beats Inflation Currently: ${goal.beatsInflation ? "YES" : "NO"}
- Goal Type: ${goal.goalType || "Wealth Creation"}
- Risk Preference: ${goal.riskPreference || "Moderate"}

========================
DYNAMIC SUPABASE DATABASE PRODUCTS:
========================
${productsBlock}

========================
STRICT AI COMPLIANCE RULES:
========================
1. ONLY USE AND REFERENCE THE PRODUCTS PROVIDED IN THE SUPABASE LIST ABOVE. NEVER invent investment products, mutual funds, companies, returns, ticker symbols, or regulatory bodies not present in this list.
2. If products list is empty, state clearly that no records exist in the Supabase database yet and explain investment fundamentals or how to add products to Supabase.
3. NEVER guarantee returns or present projections as certain outcomes. Clearly distinguish between:
   - [DATABASE]: Verifiable facts from the database (Provider, minimum investment, liquidity, regulatory status).
   - [HISTORICAL / INDICATIVE]: Indicative return ranges (explicitly note these are past/indicative and NOT guaranteed).
   - [CALCULATED PROJECTION]: Compound mathematical projections based on formulas.
   - [ASSUMPTION]: User's inflation rate or step-up assumptions.
4. Analyze potential funding gaps: compare what the available products' indicative returns can produce against the user's target of ₹${goal.targetMaturityAmount.toLocaleString("en-IN")}. If a gap exists, suggest adjusting the monthly investment or tenure, and suggest testing it in the Calculator.
5. Provide actionable guidance: invite the user to use "Calculate for My Goal" to model specific products in the Calculator.
6. Explain financial terminology simply (e.g., SIP, SEBI compliance, FIU-IND registration, Lock-in, Sovereign Guarantee).
7. Format with clean GitHub markdown, bullet points, and bold text. Keep answers structured and concise (2-4 paragraphs or a table + bullet points).
8. Always conclude with a regulatory disclaimer regarding market risks.`;

    // Convert history
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
            console.warn("[investments-ai-stream fallback]", err);
            const fallbackText = buildFallbackInvestmentResponse(message, goal, products);
            controller.enqueue(encoder.encode(fallbackText));
            controller.close();
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

    try {
      const reply = await generateChat(systemInstruction, geminiHistory, message.trim());
      const response = NextResponse.json({ reply, quota });
      return attachQuotaCookie(response, quota);
    } catch {
      const reply = buildFallbackInvestmentResponse(message, goal, products);
      const response = NextResponse.json({ reply, quota });
      return attachQuotaCookie(response, quota);
    }
  } catch (err) {
    console.error("[investments-ai-route]", err);
    const response = NextResponse.json(
      { error: "The AI investment assistant is unavailable. Please try again.", quota },
      { status: 500 }
    );
    return attachQuotaCookie(response, quota);
  }
}

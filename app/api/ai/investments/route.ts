/**
 * POST /api/ai/investments
 * Unified AI Investment Assistant.
 *
 * Strict Compliance:
 * 1. ONLY discusses investment products that exist in the Supabase results.
 * 2. Uses exact phrasing: "Database-listed indicative return range: X–Y%."
 * 3. Never says "This investment will give you X%."
 * 4. Never describes crypto FIU-IND registration as government approval or endorsement.
 * 5. If information is missing from Supabase, explicitly states that the information is unavailable.
 * 6. Never invents investment names, ISINs, ticker symbols, providers, returns, or market data.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateChat, generateChatStream } from "@/app/lib/gemini";
import { recordQuotaUsage, attachQuotaCookie } from "@/app/lib/ai-quota";
import {
  type InvestmentProduct,
  type UserFinancialGoal,
  formatIndicativeReturn,
} from "@/app/lib/investments";
import { formatINR } from "@/app/lib/finance";

interface InvestmentAssistantRequest {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  goal: UserFinancialGoal;
  products: InvestmentProduct[];
  stream?: boolean;
}

// ── Grounded Fallback Response ────────────────────────────────────────────────

function buildFallbackInvestmentResponse(
  message: string,
  goal: UserFinancialGoal,
  products: InvestmentProduct[]
): string {
  const q = message.toLowerCase();
  const tenure = Math.max(1, goal.targetMaturityYear - goal.startYear);

  if (products.length === 0) {
    return `### ⚠️ No Investment Products Detected in Supabase Database

Your \`investment_products\` table in Supabase currently contains **0 records**. As required by financial safety guidelines, I do not invent or hallucinate financial products or ticker symbols.

**Your Active Goal Summary (from Calculator):**
• Target Maturity Amount: **${formatINR(goal.targetMaturityAmount)}** by **${goal.targetMaturityYear}** (${tenure}-year horizon)
• Real Purchasing Power Target: **${formatINR(goal.inflationAdjustedTarget)}**
• Monthly Investment: **${formatINR(goal.monthlyInvestment)}/month** (${goal.annualStepUpPercent}% annual step-up)
• Configured Inflation: **${goal.inflationPercent}%** | Target Return: **${goal.expectedGrowthPercent}%**

**Next Step:**
Upload your investment dataset into the Supabase \`investment_products\` table. Once rows are inserted, I will immediately analyze them against your goal.`;
  }

  const topProduct = products[0];
  const secondProduct = products.length > 1 ? products[1] : null;

  if (q.includes("gap") || q.includes("shortfall") || q.includes("contribution")) {
    const retMin = topProduct.expected_return_min;
    return `### 📊 Contribution Gap & Goal Feasibility Analysis

**Active Target:** ${formatINR(goal.targetMaturityAmount)} by ${goal.targetMaturityYear} (${formatINR(goal.inflationAdjustedTarget)} in today's purchasing power).

**Database Insights:**
• **Monthly Commitment:** ${formatINR(goal.monthlyInvestment)}/month (${goal.annualStepUpPercent}% annual step-up)
• **Reference Product:** ${topProduct.name} (${topProduct.provider})
  - **Indicative Return:** ${formatIndicativeReturn(topProduct.expected_return_min, topProduct.expected_return_max)}
  - **Minimum Investment:** ${formatINR(topProduct.minimum_investment)}
  - **Regulatory Status:** ${topProduct.regulatory_status}

**Calculated Projection:**
At the database-listed indicative return range lower bound of ${retMin}%, mathematical compounding projects a corpus that may experience a slight shortfall if inflation stays above ${goal.inflationPercent}%.

💡 **Suggested Action:**
Consider testing a review of your monthly contribution to approximately **${formatINR(Math.round(goal.monthlyInvestment * 1.15))}/month** in the Calculator to build an inflation buffer.
[Open Calculator with Pre-filled Values](/calculator?monthly=${Math.round(goal.monthlyInvestment * 1.15)}&years=${tenure}&return=${topProduct.expected_return_min})`;
  }

  if (q.includes("compare") && secondProduct) {
    return `### ⚖️ Side-by-Side Comparison of Supabase Products

Here is a factual comparison strictly derived from your database:

| Feature | ${topProduct.name} | ${secondProduct.name} |
| :--- | :--- | :--- |
| **Category** | ${topProduct.type} | ${secondProduct.type} |
| **Provider** | ${topProduct.provider} | ${secondProduct.provider} |
| **Indicative Return** | ${topProduct.expected_return_min}% – ${topProduct.expected_return_max}% | ${secondProduct.expected_return_min}% – ${secondProduct.expected_return_max}% |
| **Risk Level** | ${topProduct.risk_level} | ${secondProduct.risk_level} |
| **Min. Investment** | ${formatINR(topProduct.minimum_investment)} | ${formatINR(secondProduct.minimum_investment)} |
| **Horizon** | ${topProduct.horizon} | ${secondProduct.horizon} |
| **Lock-in** | ${topProduct.lock_in_years ? `${topProduct.lock_in_years} Years` : "None"} | ${secondProduct.lock_in_years ? `${secondProduct.lock_in_years} Years` : "None"} |
| **Liquidity** | ${topProduct.liquidity} | ${secondProduct.liquidity} |
| **Identifiers** | ${topProduct.isin ? `ISIN: ${topProduct.isin}` : "Unavailable"} | ${secondProduct.isin ? `ISIN: ${secondProduct.isin}` : "Unavailable"} |
| **Regulatory Status** | ${topProduct.regulatory_status} | ${secondProduct.regulatory_status} |

*Safety Notice: Database-listed indicative return ranges do not guarantee future performance. Investments are subject to market risks.*`;
  }

  return `### 🎯 Goal Alignment Analysis for ${tenure}-Year Horizon

Evaluating your active target of **${formatINR(goal.targetMaturityAmount)}** by **${goal.targetMaturityYear}**:

**Database Investment Option:**
1. **${topProduct.name}**
   • **Provider:** ${topProduct.provider}
   • **Category:** ${topProduct.type}
   • **Return Range:** ${formatIndicativeReturn(topProduct.expected_return_min, topProduct.expected_return_max)}
   • **Risk Level:** ${topProduct.risk_level}
   • **Why it matches your goal:** ${topProduct.horizon} horizon · ${topProduct.risk_level} risk · ${formatINR(topProduct.minimum_investment)} minimum investment
   • **Identifiers:** ${topProduct.isin ? `ISIN: ${topProduct.isin}` : topProduct.ticker_symbol ? `Ticker: ${topProduct.ticker_symbol}` : "Not applicable"}
   • **Compliance:** ${topProduct.regulatory_status}

${secondProduct ? `2. **${secondProduct.name}**
   • **Provider:** ${secondProduct.provider}
   • **Return Range:** ${formatIndicativeReturn(secondProduct.expected_return_min, secondProduct.expected_return_max)}
   • **Risk Tier:** ${secondProduct.risk_level}
   • **Horizon:** ${secondProduct.horizon}` : ""}

💡 **Navigation:** Click **"Calculate for My Goal"** on any card to model these numbers in the Calculator.

*Disclaimer: Return figures represent database-listed indicative return ranges. Past performance does not guarantee future results.*`;
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

    // Format Database Products block strictly from Supabase
    const productsBlock = products.length > 0
      ? products.map((p, idx) => `
[DATABASE PRODUCT ${idx + 1}]
- ID: ${p.id}
- Name: ${p.name}
- Type: ${p.type}
- Provider: ${p.provider}
- Risk Level: ${p.risk_level}
- Expected Return Min: ${p.expected_return_min}%
- Expected Return Max: ${p.expected_return_max}%
- Minimum Investment: ₹${p.minimum_investment.toLocaleString("en-IN")}
- Horizon: ${p.horizon_min_years} to ${p.horizon_max_years} years
- Lock-in: ${p.lock_in_years ? `${p.lock_in_years} years` : "None"}
- Liquidity: ${p.liquidity}
- Goal Types: ${p.goal_types || "General Wealth"}
- Regulatory Status: ${p.regulatory_status}
- Source: ${p.source_name} (${p.source_url || "No URL"})
- Last Updated: ${p.last_updated}
- Data As Of: ${p.data_as_of || "Unavailable"}
- ISIN: ${p.isin || "Unavailable"}
- Ticker: ${p.ticker_symbol || "Unavailable"}
- Exchange: ${p.exchange || "Unavailable"}
- Description: ${p.description || "Unavailable"}`).join("\n")
      : "NO PRODUCTS IN DATABASE (investment_products table has 0 rows).";

    const systemInstruction = `You are autoX's Unified AI Investment Advisor.
You advise Indian users strictly using their active calculator goal and investment products fetched from their Supabase database.

========================
USER'S ACTIVE FINANCIAL GOAL (From Future Value Calculator):
========================
- Target Maturity Corpus: ₹${goal.targetMaturityAmount.toLocaleString("en-IN")}
- Inflation-Adjusted Target (Real Purchasing Power): ₹${goal.inflationAdjustedTarget.toLocaleString("en-IN")}
- Monthly Investment: ₹${goal.monthlyInvestment.toLocaleString("en-IN")}/month
- Annual Step-Up: ${goal.annualStepUpPercent}% per year
- Time Horizon: ${tenure} years (${goal.startYear} to ${goal.targetMaturityYear})
- Expected Growth Rate: ${goal.expectedGrowthPercent}% p.a.
- Configured Inflation Benchmark: ${goal.inflationPercent}% p.a.
- Beats Inflation Currently: ${goal.beatsInflation ? "YES" : "NO"}
- Goal Type: ${goal.goalType || "Wealth Creation"}
- Risk Preference: ${goal.riskPreference || "Moderate"}

========================
DYNAMIC SUPABASE DATABASE PRODUCTS:
========================
${productsBlock}

========================
CRITICAL FINANCIAL SAFETY & COMPLIANCE RULES:
========================
1. ONLY USE AND REFERENCE THE PRODUCTS PROVIDED IN THE SUPABASE LIST ABOVE. NEVER invent investment products, companies, ISINs, ticker symbols, historical returns, or regulatory bodies not present in this list.
2. If products list is empty, state clearly: "Your Supabase table contains 0 records. Once investment products are uploaded to Supabase, I can analyze them against your goal."
3. NEVER say: "This investment will give you X%."
   INSTEAD use: "Database-listed indicative return range: X–Y%."
4. NEVER guarantee returns or present projections as certain outcomes.
5. NEVER describe an investment as risk-free unless the database explicitly supports that factual description.
6. Do NOT treat historical returns as future guarantees.
7. For crypto: DO NOT describe FIU-IND registration as government approval or endorsement. State that FIU-IND registration is an AML/CFT compliance requirement, not an official investment guarantee or endorsement.
8. If information is missing from Supabase (e.g. description, ISIN, ticker), explicitly say that the information is unavailable in the database.
9. Identify potential contribution gaps: compare what the available database products' indicative returns project against the user's target of ₹${goal.targetMaturityAmount.toLocaleString("en-IN")}. If a gap exists, suggest reviewing the monthly contribution and provide navigation advice to the Calculator.
10. Format with clean GitHub markdown. Conclude with a clear regulatory disclaimer regarding market risks.`;

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

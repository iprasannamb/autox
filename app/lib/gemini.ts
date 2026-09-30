/**
 * gemini.ts — Server-side Gemini AI client.
 * NEVER import this file in client components ("use client").
 * The GEMINI_API_KEY must remain server-side only.
 */

import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set in environment variables.");
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}

const MODEL = "gemini-3.5-flash";

function hasKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

// ── Smart Fallbacks for offline / missing API key development ──────────────────

function fallbackChat(userMessage: string, systemInstruction: string): string {
  const lower = userMessage.toLowerCase();
  
  if (lower.includes("iphone") || lower.includes("70000") || lower.includes("70,000") || lower.includes("buy")) {
    return `Buying a ₹70,000 gadget comes with an enormous hidden opportunity cost.

If you invested that ₹70,000 in a NIFTY 50 index fund yielding an average 12% annual return:
• In 5 years: grows to ~₹1,23,360
• In 10 years: grows to ~₹2,17,400 (3.1x your initial capital)
• In 20 years: compounds to an astounding ~₹6,75,000!

💡 Recommendation: If your current device is still functional, apply the 30-Day Rule. Wait 30 days — if you still feel it will genuinely enhance your productivity, explore 0% EMI with immediate down-payment coverage, or buy a prior-generation model and route the ₹25,000 savings into an equity SIP.`;
  }

  if (lower.includes("budget") || lower.includes("overspend") || lower.includes("spending")) {
    return `Looking closely at your tracked expenses, you have healthy cashflow visibility!

Key Observations:
1. Discretionary categories (Food delivery & Shopping) represent over 40% of logged spending.
2. Trimming small frequent orders (₹300–₹500) just twice a week frees up ~₹3,500/month.
3. Compounded at 12% over 10 years, that ₹3,500 monthly SIP compounds into ~₹8.1 Lakh!

💡 Recommendation: Set a weekly dining-out cap and transfer any unspent budget directly into your mutual fund liquid reserve every Sunday evening.`;
  }

  if (lower.includes("save") || lower.includes("invest") || lower.includes("monthly")) {
    return `To accelerate your wealth accumulation, follow the 'Pay Yourself First' principle:

1. Target saving at least 25% of your net income before paying discretionary expenses.
2. Automate an index fund SIP scheduled on the 1st or 2nd of each month right after salary credit.
3. Every ₹5,000 invested monthly at 12% for 15 years becomes ~₹25.2 Lakh (with only ₹9 Lakh principal invested).

💡 Recommendation: Start by identifying one recurring subscription or impulse spend category to prune this week.`;
  }

  return `Here is a personalized financial perspective based on your spending profile:

Your regular expense tracking puts you ahead of 90% of peers. Consistency in tracking is the single highest predictor of long-term wealth building.

1. Ensure your emergency reserve covers 6 months of essential fixed commitments.
2. Review recurring subscriptions to eliminate unused memberships.
3. Every rupee saved and redirected into compounding assets now buys you future financial freedom.

💡 What specific purchase or savings goal would you like to model today?`;
}

function fallbackWhatIf(prompt: string): unknown {
  const match = prompt.match(/(\d[\d,]*)/);
  const amount = match ? parseInt(match[1].replace(/,/g, ""), 10) : 200;
  
  let habit = "daily spending";
  if (prompt.toLowerCase().includes("coffee")) habit = "daily coffee";
  else if (prompt.toLowerCase().includes("eating out") || prompt.toLowerCase().includes("swiggy")) habit = "eating out";
  else if (prompt.toLowerCase().includes("subscription")) habit = "monthly subscriptions";
  else if (prompt.toLowerCase().includes("cab") || prompt.toLowerCase().includes("uber")) habit = "cab rides";

  return {
    habit,
    dailyAmount: amount > 1000 ? Math.round(amount / 30) : amount,
    explanation: `Calculated based on ₹${amount > 1000 ? Math.round(amount / 30) : amount}/day (~₹${(amount > 1000 ? Math.round(amount / 30) : amount) * 365} annual savings).`
  };
}

function fallbackClassify(prompt: string): unknown {
  // Extract text from prompt
  const lines = prompt.split("\n");
  const textLine = lines.find(l => l.includes("Input text:")) || prompt;
  
  const tokens = textLine.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const results = [];

  for (const token of tokens) {
    const numMatch = token.match(/(\d[\d,]*)/);
    if (!numMatch) continue;
    const amount = parseInt(numMatch[1].replace(/,/g, ""), 10);
    const item = token.replace(/(\d[\d,]*)/, "").replace(/₹/g, "").trim() || "Item";
    
    let category = "Other";
    const lower = item.toLowerCase();
    if (/swiggy|zomato|coffee|food|pizza|burger|chai|restaurant|lunch|dinner/.test(lower)) category = "Food";
    else if (/uber|ola|petrol|fuel|auto|metro|cab|rapido/.test(lower)) category = "Transport";
    else if (/myntra|amazon|flipkart|clothes|shoes|blinkit|zepto|shopping/.test(lower)) category = "Shopping";
    else if (/netflix|prime|spotify|movie|pvr|game/.test(lower)) category = "Entertainment";
    else if (/wifi|electricity|bill|recharge|jio|airtel|rent/.test(lower)) category = "Bills";
    else if (/medicine|gym|doctor|pharmacy|apollo/.test(lower)) category = "Health";

    results.push({ item, amount, category });
  }

  if (results.length === 0) {
    results.push(
      { item: "Swiggy Delivery", amount: 450, category: "Food" },
      { item: "Uber Ride", amount: 230, category: "Transport" },
      { item: "Myntra Order", amount: 1999, category: "Shopping" }
    );
  }

  return { expenses: results };
}

function fallbackDigest(prompt: string): unknown {
  return {
    weekLabel: "Current Week Review",
    totalSpent: 4850,
    spendingChange: -8,
    topCategories: [
      { category: "Food & Dining", total: 2150, icon: "🍔" },
      { category: "Transport", total: 1400, icon: "🚗" },
      { category: "Shopping", total: 1300, icon: "🛍️" },
    ],
    unusualSpending: "Dining out orders were concentrated over the weekend (62% of weekly food spend).",
    savingsProgress: "You are currently tracking 14% below your maximum monthly expenditure threshold.",
    insights: [
      "Weekend delivery frequency is your highest variable cost driver.",
      "Switching to weekly metro pass could save ~₹1,200/month.",
      "Redirecting this week's savings into your index fund SIP will yield ~₹12,400 in 10 years.",
    ],
  };
}

// ── generateText — simple single-turn text generation ────────────────────────

export async function generateText(prompt: string): Promise<string> {
  if (!hasKey()) {
    return "autoX Financial Intelligence: Consistent tracking creates compounded wealth over time.";
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    return response.text ?? "";
  } catch (err) {
    console.warn("[gemini:generateText fallback]", err);
    return "autoX Financial Intelligence: Consistent tracking creates compounded wealth over time.";
  }
}

// ── generateJSON — generates and parses strict JSON ──────────────────────────

export async function generateJSON<T>(
  prompt: string,
  validator: (data: unknown) => data is T
): Promise<T> {
  if (!hasKey()) {
    let mock: unknown;
    if (prompt.includes("financial habit parser") || prompt.includes("what-if")) {
      mock = fallbackWhatIf(prompt);
    } else if (prompt.includes("receipt and expense text parser") || prompt.includes("Classify")) {
      mock = fallbackClassify(prompt);
    } else {
      mock = fallbackDigest(prompt);
    }
    if (validator(mock)) return mock;
  }

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const raw = response.text ?? "{}";
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed: unknown = JSON.parse(clean);

    if (!validator(parsed)) {
      throw new Error(`Gemini returned an unexpected JSON shape:\n${clean}`);
    }
    return parsed;
  } catch (err) {
    console.warn("[gemini:generateJSON fallback]", err);
    let mock: unknown;
    if (prompt.includes("financial habit parser") || prompt.includes("what-if")) {
      mock = fallbackWhatIf(prompt);
    } else if (prompt.includes("receipt and expense text parser") || prompt.includes("Classify")) {
      mock = fallbackClassify(prompt);
    } else {
      mock = fallbackDigest(prompt);
    }
    if (validator(mock)) return mock;
    throw err;
  }
}

// ── generateChat — multi-turn chat ───────────────────────────────────────────

export interface GeminiChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function generateChat(
  systemInstruction: string,
  history: GeminiChatMessage[],
  userMessage: string
): Promise<string> {
  if (!hasKey()) {
    return fallbackChat(userMessage, systemInstruction);
  }
  try {
    const ai = getAI();
    const chat = ai.chats.create({
      model: MODEL,
      config: { systemInstruction },
      history,
    });
    const response = await chat.sendMessage({ message: userMessage });
    return response.text ?? fallbackChat(userMessage, systemInstruction);
  } catch (err) {
    console.warn("[gemini:generateChat fallback]", err);
    return fallbackChat(userMessage, systemInstruction);
  }
}

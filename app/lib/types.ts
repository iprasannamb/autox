// ── Database row types ────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  expense_date: string; // "YYYY-MM-DD"
  notes: string | null;
  is_recurring: boolean;
  recurring_frequency: "weekly" | "monthly" | "yearly" | null;
  created_at: string;
}

export interface FinancialSettings {
  id?: string;
  user_id?: string;
  inflation_rate: number; // e.g. 6 = 6% p.a.
  return_rates: number[]; // e.g. [6, 8, 10, 12]
  created_at?: string;
  updated_at?: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: FinancialSettings = {
  inflation_rate: 6,
  return_rates: [6, 8, 10, 12],
};

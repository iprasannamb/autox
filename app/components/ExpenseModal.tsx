"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  RefreshCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Check,
} from "lucide-react";
import { formatINR } from "@/app/lib/finance";
import {
  CATEGORY_CONFIG,
  CATEGORIES,
  autoCategory,
  todayISO,
  fmtDate,
  getDateContextLabel,
  expandRecurringOccurrences,
  type NewExpense,
} from "@/app/lib/constants";
import type { Expense, RecurringFrequency } from "@/app/lib/types";

interface ExpenseModalProps {
  isOpen: boolean;
  expense?: Expense | null;
  onSave: (data: NewExpense, id?: string, extraOccurrences?: NewExpense[]) => Promise<void>;
  onClose: () => void;
}

export default function ExpenseModal({
  isOpen,
  expense,
  onSave,
  onClose,
}: ExpenseModalProps) {
  const isEdit = !!expense;

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Other");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [freq, setFreq] = useState<RecurringFrequency>("monthly");
  const [generatePast, setGeneratePast] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initialize or reset form when modal opens or expense changes
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setAmount(String(expense.amount));
        setDesc(expense.description);
        setCategory(expense.category || "Other");
        setDate(expense.expense_date || todayISO());
        setNotes(expense.notes || "");
        setRecurring(expense.is_recurring);
        setFreq(expense.recurring_frequency || "monthly");
        setGeneratePast(false);
      } else {
        setAmount("");
        setDesc("");
        setCategory("Other");
        setDate(todayISO());
        setNotes("");
        setRecurring(false);
        setFreq("monthly");
        setGeneratePast(true);
      }
      setSaving(false);
    }
  }, [isOpen, expense]);

  function handleDescChange(v: string) {
    setDesc(v);
    if (!isEdit && v.length > 2) {
      setCategory(autoCategory(v));
    }
  }

  // Quick date pickers
  function setQuickDaysAgo(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setDate(d.toISOString().split("T")[0]);
  }

  const dateContext = useMemo(() => getDateContextLabel(date), [date]);

  // Calculate occurrences if recurring with past date
  const pastOccurrences = useMemo(() => {
    if (isEdit || !recurring || !dateContext.isPast) return [];
    const parsed = parseFloat(amount) || 0;
    if (parsed <= 0) return [];

    const baseItem: NewExpense = {
      amount: parsed,
      description: desc.trim() || "Recurring Expense",
      category,
      expense_date: date,
      notes: notes.trim() || null,
      is_recurring: true,
      recurring_frequency: freq,
    };

    const expanded = expandRecurringOccurrences(baseItem);
    return expanded.length > 1 ? expanded : [];
  }, [isEdit, recurring, dateContext.isPast, amount, desc, category, date, notes, freq]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    setSaving(true);
    try {
      const primaryData: NewExpense = {
        amount: parsedAmount,
        description: desc.trim(),
        category,
        expense_date: date,
        notes: notes.trim() || null,
        is_recurring: recurring,
        recurring_frequency: recurring ? freq : null,
      };

      // If user selected to generate all past missed occurrences
      if (!isEdit && recurring && generatePast && pastOccurrences.length > 1) {
        // First occurrence is primaryData (or the first in the expanded array), rest are extra
        const extraOccurrences = pastOccurrences.slice(1);
        await onSave(pastOccurrences[0], undefined, extraOccurrences);
      } else {
        await onSave(primaryData, expense?.id);
      }
      onClose();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.Other;
  const CategoryIcon = cfg.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-lg rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#0D1B2A]">
                {isEdit ? "Edit Expense" : "Log Expense"}
              </h2>
              <p className="text-xs text-[#8BA3B8]">
                {isEdit
                  ? "Update expense details and date"
                  : "Track today's or any missed past-day expense"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#8BA3B8] hover:bg-[#F0F4F8] hover:text-[#0D1B2A] transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#334155]">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-extrabold text-[#94A3B8]">
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="any"
                  required
                  autoFocus={!isEdit}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] py-2.5 pl-8 pr-4 text-base font-extrabold text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                  placeholder="450.00"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-[#334155]">
                  Description
                </label>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}
                >
                  <CategoryIcon size={11} /> {category}
                </span>
              </div>
              <input
                type="text"
                required
                value={desc}
                onChange={(e) => handleDescChange(e.target.value)}
                className="w-full rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                placeholder="e.g. Swiggy Lunch, Blue Tokai Coffee, Uber Cab"
              />
            </div>

            {/* Category Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#334155]">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-bold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* ── DATE PICKER WITH PAST-DAY / MISSED HELPER CHIPS ───────── */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFD] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#334155] flex items-center gap-1.5">
                  <Calendar size={13} className="text-sky-600" />
                  Expense Date (Add Missed or Past-Day)
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    !dateContext.isPast
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-sky-50 text-sky-700"
                  }`}
                >
                  {dateContext.label}
                </span>
              </div>

              {/* Quick Date Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Today", days: 0 },
                  { label: "Yesterday", days: 1 },
                  { label: "3 Days Ago", days: 3 },
                  { label: "1 Week Ago", days: 7 },
                  { label: "1 Month Ago", days: 30 },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setQuickDaysAgo(chip.days)}
                    className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Date Input */}
              <input
                type="date"
                required
                max={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-bold text-[#0D1B2A] outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              />

              {/* Date Context Notice */}
              {dateContext.isPast && (
                <div className="flex items-center gap-2 rounded-xl bg-sky-50 p-2.5 text-[11px] font-medium text-sky-800">
                  <Clock size={13} className="shrink-0 text-sky-600" />
                  <span>
                    Logging for <strong>{fmtDate(date)}</strong>. Will be accounted for in historical budgets & analytics.
                  </span>
                </div>
              )}
            </div>

            {/* ── RECURRING OPTIONS (Daily, Weekly, Monthly, Yearly) ────── */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFD] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0D1B2A] flex items-center gap-1.5">
                    <RefreshCcw size={13} className="text-sky-600" />
                    Recurring Expense?
                  </p>
                  <p className="text-[11px] text-[#8BA3B8]">
                    Daily tea, weekly groceries, monthly SIP, annual insurance
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecurring(!recurring)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    recurring ? "bg-sky-500" : "bg-[#CBD5E1]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      recurring ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              {recurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3 pt-1"
                >
                  <div className="grid grid-cols-4 gap-2">
                    {(["daily", "weekly", "monthly", "yearly"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFreq(f)}
                        className={`rounded-xl py-2 text-xs font-bold transition capitalize ${
                          freq === f
                            ? "bg-sky-500 text-white shadow-sm"
                            : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Past recurring occurrences expansion notice */}
                  {pastOccurrences.length > 1 && !isEdit && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Sparkles size={14} className="shrink-0 text-indigo-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-indigo-900">
                            {pastOccurrences.length} Recurring Occurrences Since {fmtDate(date)}
                          </p>
                          <p className="text-[11px] text-indigo-700 leading-snug mt-0.5">
                            Auto-generates all {freq} missed instances up to today (Total: {formatINR(pastOccurrences.length * (parseFloat(amount) || 0))}).
                          </p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={generatePast}
                          onChange={(e) => setGeneratePast(e.target.checked)}
                          className="h-4 w-4 rounded accent-sky-500"
                        />
                        <span className="text-[11px] font-semibold text-[#0D1B2A]">
                          Record all {pastOccurrences.length} missed instances up to today
                        </span>
                      </label>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Optional Notes */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add receipt note, split info, or reference..."
                className="w-full rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-2 text-xs font-medium text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:bg-white"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-[#E2E8F0] py-2.5 text-xs sm:text-sm font-bold text-[#475569] hover:bg-[#F8FAFC] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !amount || parseFloat(amount) <= 0 || !desc.trim()}
                className="flex-1 rounded-2xl bg-sky-500 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_2px_8px_rgb(14_165_233/0.3)] hover:bg-sky-600 transition disabled:opacity-40"
              >
                {saving ? "Saving…" : isEdit ? "Update Expense" : "Log Expense"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus, Search, X, Trash2, Pencil, Calculator, Filter,
  ArrowUpDown, Receipt, RefreshCcw, Calendar,
} from "lucide-react";
import { useAppData } from "@/app/lib/hooks";
import { formatINR, formatINRCompact } from "@/app/lib/finance";
import {
  CATEGORY_CONFIG, CATEGORIES, autoCategory, todayISO, fmtDate, getExpenseFV,
  getDateContextLabel,
} from "@/app/lib/constants";
import type { NewExpense } from "@/app/lib/constants";
import type { Expense } from "@/app/lib/types";
import AppShell, { PageSkeleton } from "@/app/components/AppShell";
import ExpenseModal from "@/app/components/ExpenseModal";

// ── Main ExpensesClient ───────────────────────────────────────────────────────

export default function ExpensesClient() {
  const {
    user,
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    batchAddExpenses,
    signOut,
  } = useAppData();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Open add modal if ?action=add is in URL
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setShowModal(true);
    }
  }, [searchParams]);

  // Filtered + sorted expenses
  const filteredExpenses = useMemo(() => {
    let result = expenses.filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === "All" || e.category === filterCategory;
      return matchSearch && matchCategory;
    });

    result.sort((a, b) => {
      if (sortField === "date") {
        const cmp = new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
        return sortAsc ? cmp : -cmp;
      }
      return sortAsc ? a.amount - b.amount : b.amount - a.amount;
    });

    return result;
  }, [expenses, search, filterCategory, sortField, sortAsc]);

  const totalFiltered = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  async function handleSave(data: NewExpense, id?: string, extraOccurrences?: NewExpense[]) {
    if (id) {
      await updateExpense(id, data);
    } else {
      await addExpense(data);
      if (extraOccurrences && extraOccurrences.length > 0) {
        await batchAddExpenses(extraOccurrences);
      }
    }
    setShowModal(false);
    setEditingExpense(null);
  }

  function handleEdit(e: Expense) {
    setEditingExpense(e);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingExpense(null);
  }

  function toggleSort(field: "date" | "amount") {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  if (loading) return <PageSkeleton />;

  // Active categories in data
  const activeCategories = [...new Set(expenses.map((e) => e.category))].sort();

  return (
    <AppShell user={user} onSignOut={signOut}>
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0D1B2A]">Expenses</h1>
            <p className="mt-0.5 text-sm text-[#8BA3B8]">{expenses.length} transactions · {formatINR(totalFiltered)} shown</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_2px_8px_rgb(14_165_233/0.3)] transition hover:bg-sky-600 active:scale-[0.98]"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>

        {/* Search + Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses…"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-4 text-sm text-[#0D1B2A] placeholder-[#94A3B8] outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0D1B2A]">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter size={14} className="shrink-0 text-[#94A3B8]" />
            {["All", ...activeCategories].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filterCategory === cat
                    ? "bg-sky-500 text-white"
                    : "border border-[#E2E8F0] bg-white text-[#475569] hover:border-sky-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Sort controls */}
        <div className="mb-3 flex items-center gap-3 text-xs text-[#8BA3B8]">
          <span>Sort by:</span>
          <button
            onClick={() => toggleSort("date")}
            className={`flex items-center gap-1 font-semibold ${sortField === "date" ? "text-sky-600" : "hover:text-[#3D5A73]"}`}
          >
            Date <ArrowUpDown size={11} />
          </button>
          <button
            onClick={() => toggleSort("amount")}
            className={`flex items-center gap-1 font-semibold ${sortField === "amount" ? "text-sky-600" : "hover:text-[#3D5A73]"}`}
          >
            Amount <ArrowUpDown size={11} />
          </button>
        </div>

        {/* Expense list */}
        {filteredExpenses.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white py-16 text-center">
            <Receipt size={32} className="mx-auto mb-2 text-[#CBD5E1]" />
            <p className="font-semibold text-[#0D1B2A]">No expenses found</p>
            <p className="mt-1 text-sm text-[#8BA3B8]">
              {search || filterCategory !== "All" ? "Try adjusting your filters" : "Log your first expense to get started"}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white"
            >
              + Log Expense
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map((e, i) => {
              const cfg = CATEGORY_CONFIG[e.category] ?? CATEGORY_CONFIG.Other;
              const Icon = cfg.icon;
              const fv10 = getExpenseFV(e, 10, 10);
              const dateCtx = getDateContextLabel(e.expense_date);

              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="group rounded-2xl border border-[#E2E8F0] bg-white p-3 transition hover:shadow-sm sm:p-4"
                >
                  <div className="flex items-center gap-3">
                    {/* Category icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon size={18} style={{ color: cfg.color }} />
                    </div>

                    {/* Description + meta */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0D1B2A]">{e.description}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#8BA3B8]">
                        <span className={cfg.text}>{e.category}</span>
                        <span>·</span>
                        <span className="font-medium text-[#475569]">{fmtDate(e.expense_date)}</span>
                        {dateCtx.isPast && dateCtx.daysAgo > 0 && (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            {dateCtx.label}
                          </span>
                        )}
                        {e.is_recurring && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 capitalize">
                              <RefreshCcw size={9} /> {e.recurring_frequency || "recurring"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount + FV */}
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[#0D1B2A]">-{formatINR(e.amount)}</p>
                      <p className="text-[10px] font-medium text-emerald-600">10yr: {formatINRCompact(fv10)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition">
                      <Link
                        href={`/calculator?amount=${e.amount}`}
                        title="Send to Calculator"
                        className="rounded-lg p-1.5 text-[#CBD5E1] hover:bg-sky-50 hover:text-sky-500"
                      >
                        <Calculator size={14} />
                      </Link>
                      <button
                        onClick={() => handleEdit(e)}
                        title="Edit"
                        className="rounded-lg p-1.5 text-[#CBD5E1] hover:bg-sky-50 hover:text-sky-500"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        title="Delete"
                        className="rounded-lg p-1.5 text-[#CBD5E1] hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared Expense Modal */}
      <ExpenseModal
        isOpen={showModal}
        expense={editingExpense}
        onSave={handleSave}
        onClose={handleCloseModal}
      />
    </AppShell>
  );
}

/**
 * hooks.ts — Shared data loading hook for all app pages.
 * Handles auth, expense loading, settings, demo fallback, and CRUD operations.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { Expense, FinancialSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { DEMO_USER, DEMO_EXPENSES, uid, todayISO } from "./constants";
import type { NewExpense } from "./constants";
import type { ClassifiedExpense } from "./ai-types";

export interface AppUser {
  id: string;
  email?: string;
  name?: string;
}

export interface AppData {
  user: AppUser | null;
  expenses: Expense[];
  settings: FinancialSettings;
  loading: boolean;
  isDemo: boolean;
  addExpense: (data: NewExpense) => Promise<void>;
  updateExpense: (id: string, data: Partial<NewExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  batchAddExpenses: (items: (ClassifiedExpense | NewExpense)[]) => Promise<void>;
  saveSettings: (settings: FinancialSettings) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEMO_STORAGE_KEY = "autox_demo_expenses";
const EXPENSES_SYNC_EVENT = "autox_expenses_sync";

function getStoredDemoExpenses(): Expense[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function persistDemoExpenses(exps: Expense[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(exps));
    window.dispatchEvent(new CustomEvent(EXPENSES_SYNC_EVENT, { detail: exps }));
  } catch {
    // ignore
  }
}

export function useAppData(): AppData {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<AppUser | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<FinancialSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Listen for cross-page sync
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<Expense[]>;
      if (custom.detail && mounted) {
        setExpenses(custom.detail);
      }
    };
    window.addEventListener(EXPENSES_SYNC_EVENT, handleSync);

    async function init() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!mounted) return;

        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email ?? undefined,
            name: authUser.email?.split("@")[0],
          });
          setIsDemo(false);

          const [{ data: exps }, { data: sett }] = await Promise.all([
            supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
            supabase.from("financial_settings").select("*").eq("user_id", authUser.id).single(),
          ]);
          if (!mounted) return;
          setExpenses(exps ?? []);
          if (sett) setSettings(sett);
        } else {
          setUser(DEMO_USER);
          const cached = getStoredDemoExpenses();
          const initial = cached || [...DEMO_EXPENSES];
          setExpenses(initial);
          if (!cached) {
            persistDemoExpenses(initial);
          }
          setIsDemo(true);
        }
      } catch (e) {
        console.warn("Initializing with demo data", e);
        if (!mounted) return;
        setUser(DEMO_USER);
        const cached = getStoredDemoExpenses();
        const initial = cached || [...DEMO_EXPENSES];
        setExpenses(initial);
        if (!cached) {
          persistDemoExpenses(initial);
        }
        setIsDemo(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
      window.removeEventListener(EXPENSES_SYNC_EVENT, handleSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addExpense = useCallback(async (data: NewExpense) => {
    if (user && !isDemo) {
      try {
        const { data: saved } = await supabase
          .from("expenses")
          .insert([{ ...data, user_id: user.id }])
          .select()
          .single();
        if (saved) {
          setExpenses((prev) => [saved, ...prev]);
        }
      } catch (err) {
        console.error("Failed to add expense:", err);
      }
    } else {
      const newEntry: Expense = {
        id: "exp-" + uid(),
        user_id: user?.id || "demo-user-1",
        created_at: new Date().toISOString(),
        ...data,
      };
      setExpenses((prev) => {
        const updated = [newEntry, ...prev];
        persistDemoExpenses(updated);
        return updated;
      });
    }
  }, [user, isDemo, supabase]);

  const updateExpense = useCallback(async (id: string, data: Partial<NewExpense>) => {
    if (user && !isDemo) {
      try {
        const { data: updated } = await supabase
          .from("expenses")
          .update(data)
          .eq("id", id)
          .select()
          .single();
        if (updated) {
          setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
        }
      } catch (err) {
        console.error("Failed to update expense:", err);
      }
    } else {
      setExpenses((prev) => {
        const updated = prev.map((e) => (e.id === id ? { ...e, ...data } : e));
        persistDemoExpenses(updated);
        return updated;
      });
    }
  }, [user, isDemo, supabase]);

  const deleteExpense = useCallback(async (id: string) => {
    if (user && !isDemo) {
      await supabase.from("expenses").delete().eq("id", id);
    }
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      if (isDemo || !user) {
        persistDemoExpenses(updated);
      }
      return updated;
    });
  }, [user, isDemo, supabase]);

  const batchAddExpenses = useCallback(async (newItems: (ClassifiedExpense | NewExpense)[]) => {
    const today = todayISO();
    const prepared: NewExpense[] = newItems.map((item) => {
      if ("description" in item) {
        return item as NewExpense;
      }
      return {
        amount: item.amount,
        description: item.item,
        category: item.category,
        expense_date: today,
        notes: null,
        is_recurring: false,
        recurring_frequency: null,
      };
    });

    if (user && !isDemo) {
      try {
        const toInsert = prepared.map((p) => ({ ...p, user_id: user.id }));
        const { data: saved } = await supabase.from("expenses").insert(toInsert).select();
        if (saved) setExpenses((prev) => [...saved, ...prev]);
      } catch (err) {
        console.error("Failed to batch add:", err);
      }
    } else {
      const localEntries: Expense[] = prepared.map((p) => ({
        id: "exp-" + uid(),
        user_id: user?.id || "demo-user-1",
        created_at: new Date().toISOString(),
        ...p,
      }));
      setExpenses((prev) => {
        const updated = [...localEntries, ...prev];
        persistDemoExpenses(updated);
        return updated;
      });
    }
  }, [user, isDemo, supabase]);

  const saveSettings = useCallback(async (newSettings: FinancialSettings) => {
    if (user && !isDemo) {
      await supabase.from("financial_settings").upsert(
        {
          user_id: user.id,
          inflation_rate: newSettings.inflation_rate,
          return_rates: newSettings.return_rates,
        },
        { onConflict: "user_id" }
      );
    }
    setSettings(newSettings);
  }, [user, isDemo, supabase]);

  const signOut = useCallback(async () => {
    if (typeof document !== "undefined") {
      document.cookie = "autox_demo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    await supabase.auth.signOut();
    router.push("/signin");
  }, [supabase, router]);

  return {
    user,
    expenses,
    settings,
    loading,
    isDemo,
    addExpense,
    updateExpense,
    deleteExpense,
    batchAddExpenses,
    saveSettings,
    signOut,
  };
}

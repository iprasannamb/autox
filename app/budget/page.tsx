import type { Metadata } from "next";
import { Suspense } from "react";
import BudgetClient from "./BudgetClient";

export const metadata: Metadata = {
  title: "Budget — autoX",
  description: "Define monthly budgets, set category limits, and track spending against your goals.",
};

export default function BudgetPage() {
  return (
    <Suspense>
      <BudgetClient />
    </Suspense>
  );
}

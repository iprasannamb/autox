import type { Metadata } from "next";
import { Suspense } from "react";
import ExpensesClient from "./ExpensesClient";

export const metadata: Metadata = {
  title: "Expenses — autoX",
  description: "Track, add, edit, and manage all your expenses in one place.",
};

export default function ExpensesPage() {
  return (
    <Suspense>
      <ExpensesClient />
    </Suspense>
  );
}

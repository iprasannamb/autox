import type { Metadata } from "next";
import { Suspense } from "react";
import InvestmentsClient from "./InvestmentsClient";
import { PageSkeleton } from "@/app/components/AppShell";

export const metadata: Metadata = {
  title: "Investments — autoX",
  description:
    "Discover SEBI, RBI, and FIU-IND regulated investment products dynamically loaded from Supabase and matched to your active financial goal.",
};

export default function InvestmentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InvestmentsClient />
    </Suspense>
  );
}

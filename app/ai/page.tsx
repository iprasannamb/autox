import type { Metadata } from "next";
import { Suspense } from "react";
import AIClient from "./AIClient";

export const metadata: Metadata = {
  title: "AI Insights — autoX",
  description: "Your AI-powered financial assistant: smart classifier, what-if analyzer, money coach, and weekly digest.",
};

export default function AIPage() {
  return (
    <Suspense>
      <AIClient />
    </Suspense>
  );
}

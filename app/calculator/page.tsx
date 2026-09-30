import type { Metadata } from "next";
import CalculatorClient from "./CalculatorClient";

export const metadata: Metadata = {
  title: "Calculator — autoX",
  description:
    "See the real opportunity cost of spending vs investing. Enter any amount and compare Conservative, Moderate, and Aggressive investment scenarios with interactive charts.",
};

export default function CalculatorPage() {
  return <CalculatorClient />;
}

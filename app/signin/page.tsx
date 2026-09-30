import type { Metadata } from "next";
import SignInClient from "./SignInClient";

export const metadata: Metadata = {
  title: "Sign In — autoX",
  description: "Sign in to autoX and start tracking your spending against investment opportunities.",
};

export default function SignInPage() {
  return <SignInClient />;
}

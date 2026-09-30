import type { Metadata } from "next";
import SignUpClient from "./SignUpClient";

export const metadata: Metadata = {
  title: "Create Account — autoX",
  description: "Join autoX and see what your spending could become if invested instead.",
};

export default function SignUpPage() {
  return <SignUpClient />;
}

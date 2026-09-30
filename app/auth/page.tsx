import { redirect } from "next/navigation";

/** The old /auth route now redirects to /signin. */
export default function AuthPage() {
  redirect("/signin");
}

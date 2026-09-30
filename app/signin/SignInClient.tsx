"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { getURL } from "@/utils/supabase/url";


function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignInClient() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setError("Sign-in failed. Please try again.");
  }, []);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getURL("/auth/callback") },
    });
    if (error) {
      setError(error.message.toLowerCase().includes("provider") || error.message.toLowerCase().includes("not enabled")
        ? "Google sign-in isn't enabled yet. Use email/password below."
        : error.message);
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB] p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white">X</span>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">auto<span className="text-indigo-600">X</span></span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_1px_3px_0_rgb(15_23_42/0.07),0_1px_2px_-1px_rgb(15_23_42/0.05)]">
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <span className="mt-0.5 shrink-0">⚠</span>{error}
            </div>
          )}

          {/* Google */}
          <button
            id="btn-google-signin"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)] transition-all hover:border-slate-300 hover:shadow-[0_1px_3px_0_rgb(15_23_42/0.07)] disabled:opacity-60"
          >
            {googleLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" /> : <GoogleIcon />}
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form id="signin-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="input-email" className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
              <input
                id="input-email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="input-password" className="text-xs font-semibold text-slate-700">Password</label>
              </div>
              <input
                id="input-password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              />
            </div>
            <button
              id="btn-signin-submit"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_0_rgb(14_165_233/0.3)] transition-all hover:bg-sky-600 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              id="btn-demo-mode"
              type="button"
              onClick={() => {
                document.cookie = "autox_demo=true; path=/; max-age=86400";
                router.push("/dashboard?demo=true");
              }}
              className="w-full rounded-xl border border-sky-200 bg-sky-50/60 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
            >
              ✨ Explore Live Demo (Instant Preview)
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/signup" className="font-semibold text-sky-600 hover:text-sky-700">Create one →</Link>
        </p>
      </motion.div>
    </div>
  );
}

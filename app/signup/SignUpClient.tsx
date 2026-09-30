"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

export default function SignUpClient() {
  const supabase = createClient();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB] p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white">X</span>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">auto<span className="text-indigo-600">X</span></span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">Create your free account</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_1px_3px_0_rgb(15_23_42/0.07),0_1px_2px_-1px_rgb(15_23_42/0.05)]">
          {success ? (
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</span>
              </div>
              <p className="font-semibold text-slate-900">Check your email</p>
              <p className="mt-2 text-sm text-slate-500">We sent a confirmation link to <strong>{email}</strong>. Confirm it, then sign in.</p>
              <Link href="/signin" className="mt-5 block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <span className="mt-0.5 shrink-0">⚠</span>{error}
                </div>
              )}
              <form id="signup-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="input-email" className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                  <input id="input-email" type="email" required autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
                <div>
                  <label htmlFor="input-password" className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
                  <input id="input-password" type="password" required minLength={6} autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                  <p className="mt-1 text-xs text-slate-400">Minimum 6 characters</p>
                </div>
                <button id="btn-signup-submit" type="submit" disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-[0_1px_3px_0_rgb(79_70_229/0.3)] transition-all hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60">
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </form>
            </>
          )}
        </div>

        {!success && (
          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-indigo-600 hover:text-indigo-700">Sign in →</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}

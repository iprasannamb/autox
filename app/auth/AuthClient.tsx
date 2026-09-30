"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// ── Google G logo SVG (official brand colours) ────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuthClient() {
  const supabase = createClient();
  const router   = useRouter();

  const [mode, setMode]       = useState<"signin" | "signup">("signin");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Pick up OAuth error forwarded via query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setError("Sign-in failed. Please try again or use a different method.");
    }
  }, []);

  function switchMode(m: "signin" | "signup") {
    setMode(m);
    setError(null);
    setSuccess(null);
  }

  // ── Google OAuth ────────────────────────────────────────────────────────────
  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      const isNotEnabled =
        error.message.toLowerCase().includes("provider") ||
        error.message.toLowerCase().includes("not enabled") ||
        error.message.toLowerCase().includes("validation_failed");
      setError(
        isNotEnabled
          ? "Google sign-in isn't enabled yet. Use email/password below for now."
          : error.message
      );
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google — nothing else to do here.
  }

  // ── Email / password ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSuccess("Account created! Check your email to confirm, then sign in.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-sm">

        {/* ── Brand ── */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-block text-4xl font-extrabold tracking-tight text-slate-900">
            auto<span className="text-indigo-600">X</span>
          </a>
          <p className="mt-2 text-sm text-slate-500">
            Stop buying. Start growing.
          </p>
        </div>

        {/* ── Card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">

          {/* Alerts */}
          {success && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <span className="mt-0.5 shrink-0">✓</span>
              {success}
            </div>
          )}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <span className="mt-0.5 shrink-0">⚠</span>
              {error}
            </div>
          )}

          {/* ── Google sign-in ── */}
          <button
            id="btn-google-signin"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          {/* ── Divider ── */}
          <div className="my-5">
            <Divider label="or continue with email" />
          </div>

          {/* ── Mode toggle ── */}
          <div
            id="auth-mode-toggle"
            className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                id={`tab-${m}`}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  mode === m
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* ── Email / password form ── */}
          <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="input-email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Email
              </label>
              <input
                id="input-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="input-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                Password
              </label>
              <input
                id="input-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              {mode === "signup" && (
                <p className="mt-1 text-xs text-slate-400">Minimum 6 characters.</p>
              )}
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>
        </div>

        {/* ── Footer ── */}
        <p className="mt-5 text-center text-xs text-slate-400">
          Your data is encrypted and protected with Row Level Security.
        </p>
      </div>
    </div>
  );
}

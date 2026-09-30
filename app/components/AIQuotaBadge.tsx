"use client";

import { useState } from "react";
import { Sparkles, Zap, Info, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import type { AIQuota } from "@/app/lib/ai-types";

interface AIQuotaBadgeProps {
  quota: AIQuota | null;
  loading?: boolean;
  compact?: boolean;
  onRefresh?: () => void;
}

export default function AIQuotaBadge({
  quota,
  loading = false,
  compact = false,
  onRefresh,
}: AIQuotaBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!quota) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 animate-pulse ${compact ? "text-[10px] py-0.5 px-2" : ""}`}>
        <Sparkles size={12} className="text-sky-500 animate-spin" />
        <span>Loading AI Quota…</span>
      </div>
    );
  }

  const { limit, used, remaining, percent, resetHours, model, status, isFallback } = quota;

  // Determine color scheme based on status
  const isHealthy = status === "healthy";
  const isLow = status === "low";
  const isExhausted = status === "exhausted";

  const colorStyles = isHealthy
    ? {
        border: "border-sky-200",
        bg: "bg-sky-50/70",
        text: "text-sky-700",
        bar: "bg-sky-500",
        dot: "bg-sky-500",
        badge: "bg-sky-100 text-sky-800",
      }
    : isLow
    ? {
        border: "border-amber-200",
        bg: "bg-amber-50/70",
        text: "text-amber-800",
        bar: "bg-amber-500",
        dot: "bg-amber-500",
        badge: "bg-amber-100 text-amber-800",
      }
    : {
        border: "border-rose-200",
        bg: "bg-rose-50/70",
        text: "text-rose-700",
        bar: "bg-rose-500",
        dot: "bg-rose-500",
        badge: "bg-rose-100 text-rose-800",
      };

  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          title="Click to view Gemini AI quota details"
          className={`group flex items-center gap-2 rounded-lg border ${colorStyles.border} ${colorStyles.bg} px-2.5 py-1 text-[11px] font-medium ${colorStyles.text} transition hover:shadow-xs`}
        >
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colorStyles.dot}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${colorStyles.dot}`} />
          </span>
          <span className="font-semibold">
            {remaining}/{limit} AI calls
          </span>
          <span className="hidden sm:inline text-[10px] opacity-75">
            (resets in {resetHours}h)
          </span>
          <Info size={11} className="opacity-60 group-hover:opacity-100 transition" />
        </button>

        {showDetails && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-left">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={13} className="text-sky-500" />
                Gemini AI Quota
              </span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colorStyles.badge}`}>
                {status}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Available Today:</span>
                <span className="font-semibold text-slate-800">{remaining} / {limit} requests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Model:</span>
                <span className="font-medium text-slate-700">{model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Reset:</span>
                <span className="font-medium text-slate-700">In ~{resetHours} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Offline Recovery:</span>
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Ready
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${colorStyles.bar} transition-all duration-500`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400 text-right">{percent}% quota remaining</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full / Banner Card presentation
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${colorStyles.border} bg-white p-4 sm:p-5 shadow-xs transition`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorStyles.bg} ${colorStyles.text}`}>
            <Zap size={20} className={isHealthy ? "fill-sky-500 text-sky-500" : ""} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#0D1B2A]">
                AI Intelligence Quota
              </h4>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colorStyles.badge}`}>
                {status === "offline_mode" ? "Local Heuristic Mode" : `${remaining} Left Today`}
              </span>
            </div>
            <p className="text-xs text-[#8BA3B8]">
              {isExhausted
                ? "Daily Gemini limit reached. AutoX Intelligent Offline Engine handles all queries seamlessly."
                : `Powered by ${model} · Resets automatically in ~${resetHours}h at midnight`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:text-right">
          <div className="min-w-[140px] flex-1 sm:flex-initial">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-slate-600">Daily Allowance</span>
              <span className={colorStyles.text}>
                {remaining} / {limit} left
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full ${colorStyles.bar} transition-all duration-500`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh quota status"
              className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-sky-500" : ""} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

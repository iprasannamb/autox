/**
 * ai-quota.ts — Server-side AI Quota Tracker & Rate Limiter for autoX.
 * Tracks daily quota usage, computes remaining requests, handles daily reset,
 * and maintains client cookie synchronization for reliable state preservation.
 */

import { NextRequest, NextResponse } from "next/server";
import type { AIQuota } from "./ai-types";

// Default daily requests allowed per user/session
const DEFAULT_DAILY_LIMIT = 25;
const COOKIE_NAME = "autox_ai_quota_v1";

interface StoredQuota {
  date: string; // YYYY-MM-DD
  used: number;
}

// In-memory fallback cache
const memoryQuotaStore = new Map<string, StoredQuota>();

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function parseCookieQuota(req?: NextRequest): StoredQuota | null {
  if (!req) return null;
  const cookieVal = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookieVal) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieVal)) as StoredQuota;
    if (parsed && typeof parsed.date === "string" && typeof parsed.used === "number") {
      return parsed;
    }
  } catch {
    // Ignore invalid cookie
  }
  return null;
}

function getClientIdentifier(req?: NextRequest): string {
  if (!req) return "default_client";
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  return ip;
}

export function getAIQuota(req?: NextRequest): AIQuota {
  const today = getTodayString();
  const nextMidnight = getNextMidnight();
  const resetHours = Math.max(1, Math.round((nextMidnight.getTime() - Date.now()) / (1000 * 60 * 60)));
  const limit = process.env.AI_DAILY_QUOTA ? parseInt(process.env.AI_DAILY_QUOTA, 10) || DEFAULT_DAILY_LIMIT : DEFAULT_DAILY_LIMIT;

  const cookieQuota = parseCookieQuota(req);
  const clientId = getClientIdentifier(req);
  const memoryQuota = memoryQuotaStore.get(clientId);

  let used = 0;
  if (cookieQuota && cookieQuota.date === today) {
    used = cookieQuota.used;
  } else if (memoryQuota && memoryQuota.date === today) {
    used = memoryQuota.used;
  }

  const remaining = Math.max(0, limit - used);
  const percent = Math.min(100, Math.max(0, Math.round((remaining / limit) * 100)));
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

  let status: AIQuota["status"] = "healthy";
  if (!hasKey) {
    status = "offline_mode";
  } else if (remaining === 0) {
    status = "exhausted";
  } else if (remaining <= 5) {
    status = "low";
  }

  return {
    limit,
    used,
    remaining,
    percent,
    resetsAt: nextMidnight.toISOString(),
    resetHours,
    model: "Gemini 2.5 Flash",
    status,
    isFallback: remaining === 0 || !hasKey,
  };
}

export function recordQuotaUsage(req?: NextRequest): AIQuota {
  const today = getTodayString();
  const clientId = getClientIdentifier(req);
  const current = getAIQuota(req);

  const newUsed = Math.min(current.limit, current.used + 1);
  const stored: StoredQuota = { date: today, used: newUsed };

  memoryQuotaStore.set(clientId, stored);

  const nextMidnight = getNextMidnight();
  const resetHours = Math.max(1, Math.round((nextMidnight.getTime() - Date.now()) / (1000 * 60 * 60)));
  const remaining = Math.max(0, current.limit - newUsed);
  const percent = Math.min(100, Math.max(0, Math.round((remaining / current.limit) * 100)));
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

  let status: AIQuota["status"] = "healthy";
  if (!hasKey) {
    status = "offline_mode";
  } else if (remaining === 0) {
    status = "exhausted";
  } else if (remaining <= 5) {
    status = "low";
  }

  return {
    limit: current.limit,
    used: newUsed,
    remaining,
    percent,
    resetsAt: nextMidnight.toISOString(),
    resetHours,
    model: "Gemini 2.5 Flash",
    status,
    isFallback: remaining === 0 || !hasKey,
  };
}

export function attachQuotaCookie(response: NextResponse, quota: AIQuota): NextResponse {
  const today = getTodayString();
  const val = encodeURIComponent(JSON.stringify({ date: today, used: quota.used }));
  // Cookie expires at midnight
  const maxAge = Math.max(3600, Math.round((new Date(quota.resetsAt).getTime() - Date.now()) / 1000));
  response.cookies.set(COOKIE_NAME, val, {
    path: "/",
    maxAge,
    sameSite: "lax",
    httpOnly: false, // Accessible by client if needed
  });
  return response;
}

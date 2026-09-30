/**
 * GET /api/ai/quota
 * Returns current Gemini AI quota usage, limits, and reset timing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAIQuota, attachQuotaCookie } from "@/app/lib/ai-quota";

export async function GET(request: NextRequest) {
  try {
    const quota = getAIQuota(request);
    const response = NextResponse.json({
      success: true,
      quota,
    });
    return attachQuotaCookie(response, quota);
  } catch (err) {
    console.error("[api/ai/quota]", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch AI quota",
      },
      { status: 500 }
    );
  }
}

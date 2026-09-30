import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseProxyClient } from "@/utils/supabase/proxy";
import { getSiteUrl } from "@/utils/supabase/url";

/** Routes that require an authenticated user. */
const PROTECTED = ["/dashboard", "/calculator"];

/** Auth pages — authenticated users are redirected away from these. */
const AUTH_PAGES = ["/signin", "/signup", "/auth"];

/**
 * Creates a redirect response that:
 * 1. Preserves the incoming request's actual host/protocol (avoiding raw request.url localhost issues)
 * 2. Ensures production never redirects to localhost
 * 3. Copies any set-cookie headers from the Supabase client or demo session
 */
function redirectWithCookies(
  request: NextRequest,
  destinationPath: string,
  baseResponse?: NextResponse
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = destinationPath;
  redirectUrl.search = "";

  // If in production and host resolved to localhost, fall back to configured site URL
  if (
    process.env.NODE_ENV !== "development" &&
    (redirectUrl.hostname === "localhost" || redirectUrl.hostname === "127.0.0.1")
  ) {
    try {
      const siteUrl = new URL(getSiteUrl());
      redirectUrl.protocol = siteUrl.protocol;
      redirectUrl.host = siteUrl.host;
      redirectUrl.port = siteUrl.port;
    } catch {
      // Continue if URL parsing fails
    }
  }

  const response = NextResponse.redirect(redirectUrl);

  // Preserve any mutated cookies from Supabase or proxy
  if (baseResponse) {
    baseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createSupabaseProxyClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isDemoParam = request.nextUrl.searchParams.get("demo") === "true";
  const isDemo = isDemoParam || request.cookies.get("autox_demo")?.value === "true";

  // Prepare response object that will hold cookies
  const res = getResponse();
  if (isDemoParam) {
    res.cookies.set("autox_demo", "true", { path: "/", maxAge: 86400 });
  }

  // Unauthenticated and not demo → redirect protected routes to /signin
  if (!user && !isDemo && PROTECTED.some((p) => pathname.startsWith(p))) {
    return redirectWithCookies(request, "/signin", res);
  }

  // Authenticated → redirect away from auth pages
  if (user && AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Keep /auth/callback working
    if (pathname.startsWith("/auth/callback")) return res;
    return redirectWithCookies(request, "/dashboard", res);
  }

  // Authenticated on landing → redirect to dashboard
  if (user && pathname === "/") {
    return redirectWithCookies(request, "/dashboard", res);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};


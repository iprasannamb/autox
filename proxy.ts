import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseProxyClient } from "@/utils/supabase/proxy";

/** Routes that require an authenticated user. */
const PROTECTED = ["/dashboard", "/calculator"];

/** Auth pages — authenticated users are redirected away from these. */
const AUTH_PAGES = ["/signin", "/signup", "/auth"];

export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createSupabaseProxyClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isDemoParam = request.nextUrl.searchParams.get("demo") === "true";
  const isDemo = isDemoParam || request.cookies.get("autox_demo")?.value === "true";

  // Unauthenticated and not demo → redirect protected routes to /signin
  if (!user && !isDemo && PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // Set demo cookie if ?demo=true was provided
  const res = getResponse();
  if (isDemoParam) {
    res.cookies.set("autox_demo", "true", { path: "/", maxAge: 86400 });
  }

  // Authenticated → redirect away from auth pages
  if (user && AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Keep /auth/callback working
    if (pathname.startsWith("/auth/callback")) return res;
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Authenticated on landing → redirect to dashboard
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return getResponse();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

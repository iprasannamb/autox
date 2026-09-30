import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/proxy";

/**
 * Next.js 16 proxy (formerly middleware).
 *
 * Runs before every matched request to keep the Supabase session fresh.
 * The createClient helper reads the incoming auth cookies, silently calls
 * supabase.auth.getUser() to refresh the token if needed, and writes the
 * updated cookies back onto both the forwarded request and the response.
 *
 * IMPORTANT: Do not rely solely on this proxy for auth enforcement.
 * Always verify the session inside Server Components, Server Actions, or
 * Route Handlers as recommended in the Supabase + Next.js docs.
 */
export async function proxy(request: NextRequest) {
  return createClient(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     *  - _next/static  (built assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico, sitemap.xml, robots.txt (metadata)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

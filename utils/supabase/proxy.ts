import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase client in the proxy (edge) context.
 *
 * Returns:
 *  - `supabase`    — the client instance (use for supabase.auth.getUser())
 *  - `getResponse` — call this at the end of the proxy function to obtain a
 *                    NextResponse that carries any mutated auth cookies.
 *
 * Used exclusively from proxy.ts (Next.js 16 replacement for middleware.ts).
 */
export function createSupabaseProxyClient(request: NextRequest) {
  // Start with a pass-through response; may be rebuilt if cookies are set.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Mirror new cookies onto the request so upstream code sees them.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Rebuild the response so the browser also receives the cookies.
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, getResponse: () => supabaseResponse };
}

import { createClient } from "@/utils/supabase/server";
import { getRequestOrigin } from "@/utils/supabase/url";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /auth/callback
 *
 * Supabase OAuth and Magic Link flows redirect here with a `code` parameter.
 * We exchange it for a session, write auth cookies, then forward the user to
 * their destination (defaults to /dashboard).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  // `next` lets Supabase flows carry a custom redirect path
  const next = searchParams.get("next") ?? "/dashboard";

  // Resolve production vs local origin from headers and environment
  const origin = getRequestOrigin(request);
  const targetUrl = next.startsWith("/") ? `${origin}${next}` : `${origin}/${next}`;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Session is now live — send the user to the destination on the proper host
      return NextResponse.redirect(targetUrl);
    }
  }

  // Something went wrong — redirect back to auth with an error hint
  return NextResponse.redirect(`${origin}/signin?error=oauth_failed`);
}


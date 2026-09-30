/**
 * Environment-aware URL resolution for autoX.
 *
 * Handles URL creation for Supabase Auth redirects, OAuth callbacks,
 * and proxy redirects across local development (localhost:3000)
 * and production (https://autox-topaz.vercel.app or custom domains).
 */

/**
 * Returns the base public origin of the site.
 *
 * Priority order:
 * 1. NEXT_PUBLIC_SITE_URL (set in Vercel or .env.local)
 * 2. NEXT_PUBLIC_APP_URL
 * 3. Client-side browser context: window.location.origin
 * 4. VERCEL_PROJECT_PRODUCTION_URL (Vercel system env var)
 * 5. VERCEL_URL / NEXT_PUBLIC_VERCEL_URL (Vercel deployment env var)
 * 6. Fallback: http://localhost:3000
 */
export function getSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  // If in browser context and no explicit override is given, use current origin
  if (!url && typeof window !== "undefined" && window.location.origin) {
    url = window.location.origin;
  }

  // Vercel deployment variables (available at server / build runtime)
  if (!url) {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      url = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    } else if (process.env.VERCEL_URL) {
      url = `https://${process.env.VERCEL_URL}`;
    }
  }

  // Fallback to local development port
  if (!url) {
    url = "http://localhost:3000";
  }

  // Ensure scheme is present
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Strip trailing slashes
  return url.replace(/\/+$/, "");
}

/**
 * Returns a fully qualified absolute URL for a given path.
 *
 * Example:
 *   getURL("/auth/callback") -> "https://autox-topaz.vercel.app/auth/callback" (production)
 *   getURL("/auth/callback") -> "http://localhost:3000/auth/callback" (development)
 */
export function getURL(path: string = ""): string {
  const base = getSiteUrl();
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${base}${cleanPath}`;
}

/**
 * Extracts the correct public origin from an incoming server-side Request.
 *
 * Next.js Route Handlers on Vercel run inside a Node/Lambda container where
 * `request.url` defaults to `http://localhost:3000/...`.
 *
 * This function inspects `x-forwarded-host` and `x-forwarded-proto` to reconstruct
 * the actual public URL requested by the client, and falls back to `getSiteUrl()`.
 */
export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  // In local development, if request.url has localhost, preserve it
  if (process.env.NODE_ENV === "development") {
    try {
      const { origin } = new URL(request.url);
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return origin;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Deployed behind reverse proxy (e.g. Vercel)
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  return getSiteUrl();
}

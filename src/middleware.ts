import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ph_session";

/**
 * Lightweight page gatekeeper: bounces obviously-unauthenticated visitors away
 * from /projects/** before rendering, so they get a clean redirect instead of a
 * skeleton flash. This is deliberately cheap (format + expiry only) — the real
 * HMAC signature verification still happens server-side in every page and API
 * route via `lib/auth` (`requirePageAuth` / `requireApiAuth`).
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const parts = token.split(".");
  const looksValid =
    parts.length === 3 &&
    parts[0] === "v1" &&
    /^\d+$/.test(parts[1]) &&
    /^[a-f0-9]{64}$/.test(parts[2]) &&
    Number(parts[1]) > Date.now();

  if (!looksValid) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*"],
};

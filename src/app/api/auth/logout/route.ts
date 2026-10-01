import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, sessionCookieSecure } from "@/lib/auth";

/** Clears the session cookie and redirects to /login. Works as a plain form POST. */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(await sessionCookieSecure()),
    maxAge: 0,
  });
  return response;
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * Extremely simple shared-password auth:
 *  - one password from the PROJECT_HUB_PASSWORD env var (never stored in MongoDB)
 *  - on success we set a signed, HTTP-only session cookie (no password client-side)
 *  - the cookie contains only a version + expiry, signed with HMAC-SHA256
 */

export const SESSION_COOKIE = "ph_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSharedPassword(): string {
  const password = process.env.PROJECT_HUB_PASSWORD;
  if (password && password.length > 0) return password;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PROJECT_HUB_PASSWORD is not set. Configure it before starting in production.");
  }
  return "1111"; // local development fallback
}

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Derived from the password so sessions stay valid without extra config.
  // Set SESSION_SECRET explicitly in production for cleaner key rotation.
  return createHmac("sha256", "project-hub-session").update(getSharedPassword()).digest("hex");
}

/** Timing-safe password comparison. */
export function verifyPassword(input: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(getSharedPassword());
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `v1.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(parts[2], sign(`v1.${parts[1]}`));
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** For server components / pages — redirects to /login when there is no valid session. */
export async function requirePageAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/login");
}

/** For API route handlers — returns a 401 response, or null when authenticated. */
export async function requireApiAuth(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function createSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
}

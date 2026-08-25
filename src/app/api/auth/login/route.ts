import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  let password = "";
  try {
    const body = await request.json();
    if (typeof body?.password === "string") password = body.password;
  } catch {
    // fall through to the failure path below
  }

  if (!password || !verifyPassword(password)) {
    // Small delay to slow down brute-force attempts.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}

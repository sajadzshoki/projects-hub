import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/auth";
import { fetchSiteImages } from "@/lib/site-image";

const bodySchema = z.object({
  urls: z.array(z.string().trim().max(500)).max(100),
});

/**
 * POST /api/site-image — preview images (og:image) for project websites.
 * Body: { urls: string[] } → { images: { [url]: string | null } }
 */
export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const images = await fetchSiteImages(parsed.data.urls);
    return NextResponse.json({ images });
  } catch (error) {
    console.error("POST /api/site-image failed", error);
    return NextResponse.json({ error: "Could not read site images." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { toggleFavorite } from "@/lib/projects";

/** POST /api/projects/[id]/favorite — toggles the favorite flag. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const favorite = await toggleFavorite(id);
    if (favorite === null) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ favorite });
  } catch (error) {
    console.error(`POST /api/projects/${id}/favorite failed`, error);
    return NextResponse.json({ error: "Could not update favorite." }, { status: 500 });
  }
}

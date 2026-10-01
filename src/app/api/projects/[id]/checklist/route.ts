import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { replaceChecklist } from "@/lib/projects";
import { checklistUpdateSchema, zodFieldErrors } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/projects/[id]/checklist — replace the checklist only. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = checklistUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: zodFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const checklist = await replaceChecklist(id, parsed.data.checklist);
    if (!checklist) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ checklist });
  } catch (error) {
    console.error(`PATCH /api/projects/${id}/checklist failed`, error);
    return NextResponse.json({ error: "Could not update the checklist." }, { status: 500 });
  }
}

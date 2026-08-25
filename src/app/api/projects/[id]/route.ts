import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { deleteProject, getProject, updateProject } from "@/lib/projects";
import { projectSchema, zodFieldErrors } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/projects/[id] */
export async function GET(_request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const project = await getProject(id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error) {
    console.error(`GET /api/projects/${id} failed`, error);
    return NextResponse.json({ error: "Could not load the project." }, { status: 500 });
  }
}

/** PATCH /api/projects/[id] — full update, bumps `updatedAt`. */
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

  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fields: zodFieldErrors(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const project = await updateProject(id, parsed.data);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error) {
    console.error(`PATCH /api/projects/${id} failed`, error);
    return NextResponse.json({ error: "Could not update the project." }, { status: 500 });
  }
}

/** DELETE /api/projects/[id] */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  try {
    const deleted = await deleteProject(id);
    if (!deleted) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`DELETE /api/projects/${id} failed`, error);
    return NextResponse.json({ error: "Could not delete the project." }, { status: 500 });
  }
}

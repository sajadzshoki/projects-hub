import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { createProject, listProjects } from "@/lib/projects";
import { projectSchema, zodFieldErrors } from "@/lib/validation";

/** GET /api/projects — list all projects (session required). */
export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("GET /api/projects failed", error);
    return NextResponse.json({ error: "Could not load projects." }, { status: 500 });
  }
}

/** POST /api/projects — create a project (session required, server-side validated). */
export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

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
    const project = await createProject(parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects failed", error);
    return NextResponse.json({ error: "Could not create the project." }, { status: 500 });
  }
}

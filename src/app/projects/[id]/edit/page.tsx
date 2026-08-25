import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageAuth } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import AppHeader from "@/components/AppHeader";
import ProjectForm from "@/components/projects/ProjectForm";
import { ChevronLeftIcon } from "@/components/icons";

export const metadata = { title: "Edit project" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: PageProps) {
  await requirePageAuth();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-text"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          Back to project
        </Link>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Edit project</h1>
        <p className="mt-1 truncate text-xs text-muted">{project.title}</p>
        <div className="mt-6">
          <ProjectForm mode="edit" initial={project} />
        </div>
      </main>
    </div>
  );
}

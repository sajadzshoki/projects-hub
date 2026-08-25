import { requirePageAuth } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import ProjectBrowser from "@/components/projects/ProjectBrowser";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { PlusIcon } from "@/components/icons";
import Link from "next/link";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await requirePageAuth();

  let projects = null;
  let loadError: string | null = null;
  try {
    projects = await listProjects();
  } catch (error) {
    console.error("Failed to load projects", error);
    loadError =
      "Could not load projects. Check that MongoDB is running and MONGODB_URI is correct.";
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {projects ? (
        <ProjectBrowser initialProjects={projects} />
      ) : (
        <>
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-16 md:px-6">
            <EmptyState
              title="Could not load projects"
              description={loadError ?? "Could not load projects."}
              action={
                <Link href="/projects/new" className={buttonClasses({ variant: "primary" })}>
                  <PlusIcon className="h-4 w-4" />
                  Add Project
                </Link>
              }
            />
          </main>
        </>
      )}
    </div>
  );
}

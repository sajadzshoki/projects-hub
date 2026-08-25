import Link from "next/link";
import { requirePageAuth } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import ProjectForm from "@/components/projects/ProjectForm";
import { ChevronLeftIcon } from "@/components/icons";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requirePageAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-text"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          All projects
        </Link>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Add project</h1>
        <p className="mt-1 text-xs text-muted">
          Only the title and description are required — everything else can be filled in later.
        </p>
        <div className="mt-6">
          <ProjectForm mode="create" />
        </div>
      </main>
    </div>
  );
}

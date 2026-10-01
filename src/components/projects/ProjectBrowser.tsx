"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ChecklistItem, Project } from "@/lib/types";
import AppHeader from "@/components/AppHeader";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectFilters, { type QuickFilter } from "@/components/projects/ProjectFilters";
import ProjectGrid from "@/components/projects/ProjectGrid";
import ProjectSearch from "@/components/projects/ProjectSearch";
import type { SortKey } from "@/components/projects/ProjectSort";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Toast from "@/components/ui/Toast";
import { buttonClasses, Button } from "@/components/ui/Button";
import { FolderPlusIcon, PlusIcon, SearchIcon } from "@/components/icons";

const comparators: Record<SortKey, (a: Project, b: Project) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  alpha: (a, b) => a.title.localeCompare(b.title),
  favorites: (a, b) =>
    Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt),
};

/**
 * The main dashboard: header + search + filters + card grid.
 * Search/filter/sort run client-side over the server-loaded projects — instant,
 * zero round-trips, and perfectly fast for an internal tool's project count.
 */
export default function ProjectBrowser({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("All");
  const [type, setType] = useState("All");
  const [tag, setTag] = useState("All");
  const [sort, setSort] = useState<SortKey>("updated");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Keep local state in sync when the server re-renders with fresh data.
  useEffect(() => setProjects(initialProjects), [initialProjects]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string) => setToast(message), []);

  const allTags = useMemo(
    () => Array.from(new Set(projects.flatMap((project) => project.tags))).sort((a, b) =>
      a.localeCompare(b)
    ),
    [projects]
  );

  const hasActiveFilters =
    quick !== "All" || type !== "All" || tag !== "All" || query.trim() !== "";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = projects.filter((project) => {
      if (quick === "Favorites" ? !project.favorite : quick !== "All" && project.status !== quick) {
        return false;
      }
      if (type !== "All" && project.projectType !== type) return false;
      if (tag !== "All" && !project.tags.includes(tag)) return false;
      if (needle) {
        const haystack = [
          project.title,
          project.description,
          project.projectType,
          project.status,
          project.tags.join(" "),
          project.checklist.map((item) => item.text).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    return [...list].sort(comparators[sort]);
  }, [projects, query, quick, type, tag, sort]);

  function handleFavoriteChange(id: string, favorite: boolean) {
    setProjects((previous) =>
      previous.map((project) => (project.id === id ? { ...project, favorite } : project))
    );
  }

  function handleChecklistChange(id: string, checklist: ChecklistItem[]) {
    setProjects((previous) =>
      previous.map((project) => (project.id === id ? { ...project, checklist } : project))
    );
  }

  function clearFilters() {
    setQuick("All");
    setType("All");
    setTag("All");
    setQuery("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setProjects((previous) => previous.filter((project) => project.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("Project deleted.");
    } catch {
      setDeleteTarget(null);
      showToast("Could not delete the project. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader search={<ProjectSearch value={query} onChange={setQuery} />} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 md:px-6">
        <ProjectFilters
          quick={quick}
          type={type}
          tag={tag}
          sort={sort}
          allTags={allTags}
          resultCount={filtered.length}
          total={projects.length}
          onQuickChange={setQuick}
          onTypeChange={setType}
          onTagChange={setTag}
          onSortChange={setSort}
          onClear={clearFilters}
        />

        <div className="mt-5">
          {filtered.length > 0 ? (
            <ProjectGrid>
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onFavoriteChange={handleFavoriteChange}
                  onChecklistChange={handleChecklistChange}
                  onDelete={setDeleteTarget}
                />
              ))}
            </ProjectGrid>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderPlusIcon className="h-5 w-5" />}
              title="No projects yet"
              description="Add your first project to get started."
              action={
                <Link href="/projects/new" className={buttonClasses({ variant: "primary" })}>
                  <PlusIcon className="h-4 w-4" />
                  Add Project
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<SearchIcon className="h-5 w-5" />}
              title="No projects found"
              description="Try changing your search or filters."
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear search & filters
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      </main>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this project?"
        message={
          deleteTarget ? `“${deleteTarget.title}” will be permanently removed.` : ""
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <Toast message={toast} />
    </div>
  );
}

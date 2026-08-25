import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requirePageAuth } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { formatDate, formatRelativeDate } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import CoverImage from "@/components/projects/CoverImage";
import FavoriteButton from "@/components/projects/FavoriteButton";
import StatusBadge from "@/components/projects/StatusBadge";
import TagList from "@/components/projects/TagList";
import CopyButton from "@/components/projects/CopyButton";
import DeleteProjectButton from "@/components/projects/DeleteProjectButton";
import { buttonClasses } from "@/components/ui/Button";
import {
  ChevronLeftIcon,
  DashboardIcon,
  ExternalLinkIcon,
  GithubIcon,
  PencilIcon,
  SparklesIcon,
} from "@/components/icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id).catch(() => null);
  return { title: project?.title ?? "Project" };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  await requirePageAuth();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-text"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          All projects
        </Link>

        <article className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <CoverImage
            src={project.coverImage}
            alt={`Cover for ${project.title}`}
            title={project.title}
            className="aspect-[21/9] border-b border-border"
          />

          <div className="space-y-6 p-5 md:p-7">
            {/* ── Title + meta ─────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
                  {project.title}
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
                  <StatusBadge status={project.status} />
                  <span className="font-mono text-[10.5px] uppercase tracking-wide text-muted/80">
                    {project.projectType}
                  </span>
                  <span suppressHydrationWarning>Updated {formatRelativeDate(project.updatedAt)}</span>
                  <span className="text-muted/60">Created {formatDate(project.createdAt)}</span>
                </div>
              </div>
              <FavoriteButton
                projectId={project.id}
                favorite={project.favorite}
                variant="plain"
                className="mt-1"
              />
            </div>

            {/* ── Actions ──────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
              {project.projectUrl && (
                <a
                  href={project.projectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "primary" })}
                >
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                  Open Project
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  GitHub
                </a>
              )}
              {project.adminPanelUrl && (
                <a
                  href={project.adminPanelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  <DashboardIcon className="h-3.5 w-3.5" />
                  Admin Panel
                </a>
              )}
              <span className="ml-auto flex items-center gap-1">
                <Link
                  href={`/projects/${project.id}/edit`}
                  className={buttonClasses({ variant: "secondary" })}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                  Edit
                </Link>
                <DeleteProjectButton project={project} />
              </span>
            </div>

            {/* ── Description ──────────────────────────────────────────────── */}
            <p className="break-words text-sm leading-relaxed text-text/90">
              {project.description}
            </p>

            <TagList tags={project.tags} />

            {/* ── Notes ────────────────────────────────────────────────────── */}
            {project.notes && (
              <section className="space-y-2.5 border-t border-border pt-5">
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted">
                  Notes
                </h2>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text/80">
                  {project.notes}
                </p>
              </section>
            )}

            {/* ── AI Documentation ─────────────────────────────────────────── */}
            {project.aiDocumentation && (
              <section className="space-y-2.5 border-t border-border pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-widest text-muted">
                    <SparklesIcon className="h-3.5 w-3.5" />
                    AI Documentation
                  </h2>
                  <CopyButton text={project.aiDocumentation} />
                </div>
                <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed text-text/85">
                  {project.aiDocumentation}
                </pre>
              </section>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}

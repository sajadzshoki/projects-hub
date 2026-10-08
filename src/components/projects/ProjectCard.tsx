import Link from "next/link";
import type { ChecklistItem, Project } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import CoverImage from "@/components/projects/CoverImage";
import FavoriteButton from "@/components/projects/FavoriteButton";
import ProjectChecklist from "@/components/projects/ProjectChecklist";
import StatusBadge from "@/components/projects/StatusBadge";
import TagList from "@/components/projects/TagList";
import { IconButton } from "@/components/ui/Button";
import {
  DashboardIcon,
  ExternalLinkIcon,
  GithubIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/icons";

interface ProjectCardProps {
  project: Project;
  onFavoriteChange: (id: string, favorite: boolean) => void;
  onChecklistChange: (id: string, checklist: ChecklistItem[]) => void;
  onDelete: (project: Project) => void;
}

/** One project in the grid — cover, meta, tags and quick actions. */
export default function ProjectCard({
  project,
  onFavoriteChange,
  onChecklistChange,
  onDelete,
}: ProjectCardProps) {
  const detailHref = `/projects/${project.id}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong">
      <div className="relative">
        <Link href={detailHref} aria-label={`Open ${project.title}`} className="block">
          <CoverImage
            src={project.coverImage}
            siteUrl={project.projectUrl}
            alt=""
            title={project.title}
            className="aspect-video border-b border-border"
          />
        </Link>
        <div className="absolute right-2 top-2">
          <FavoriteButton
            projectId={project.id}
            favorite={project.favorite}
            variant="overlay"
            onToggle={(favorite) => onFavoriteChange(project.id, favorite)}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={detailHref}
          className="break-words text-sm font-semibold leading-snug transition-colors hover:text-accent-fg"
        >
          {project.title}
        </Link>
        {project.description && (
          <p className="line-clamp-2 break-words text-xs leading-relaxed text-muted">
            {project.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          <span className="font-mono text-[10.5px] uppercase tracking-wide text-muted/70">
            {project.projectType}
          </span>
        </div>

        <TagList tags={project.tags} max={3} />

        <ProjectChecklist
          persist="live"
          variant="card"
          projectId={project.id}
          items={project.checklist}
          onChange={(checklist) => onChecklistChange(project.id, checklist)}
        />

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <span className="text-[11px] text-muted" suppressHydrationWarning>
            Updated {formatRelativeDate(project.updatedAt)}
          </span>
          <div className="-mr-1 flex items-center gap-0.5">
            {project.projectUrl && (
              <IconButton href={project.projectUrl} title="Open project">
                <ExternalLinkIcon />
              </IconButton>
            )}
            {project.githubUrl && (
              <IconButton href={project.githubUrl} title="GitHub repository">
                <GithubIcon />
              </IconButton>
            )}
            {project.adminPanelUrl && (
              <IconButton href={project.adminPanelUrl} title="Admin panel">
                <DashboardIcon />
              </IconButton>
            )}
            <IconButton href={`${detailHref}/edit`} title="Edit project">
              <PencilIcon />
            </IconButton>
            <button
              type="button"
              onClick={() => onDelete(project)}
              title="Delete project"
              aria-label={`Delete ${project.title}`}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-md text-muted transition-colors",
                "hover:bg-red-500/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              )}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

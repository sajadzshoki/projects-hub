import type { ProjectStatus, ProjectType } from "./constants";

/** One line on a project's checklist. */
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

/**
 * A project as it is exposed to the UI / API.
 * Dates are ISO strings so the object is safe to pass from server to client components.
 */
export interface Project {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  projectUrl: string | null;
  githubUrl: string | null;
  adminPanelUrl: string | null;
  status: ProjectStatus;
  projectType: ProjectType;
  tags: string[];
  checklist: ChecklistItem[];
  favorite: boolean;
  notes: string;
  aiDocumentation: string;
  createdAt: string;
  updatedAt: string;
}

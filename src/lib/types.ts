import type { ProjectStatus, ProjectType } from "./constants";

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
  favorite: boolean;
  notes: string;
  aiDocumentation: string;
  createdAt: string;
  updatedAt: string;
}

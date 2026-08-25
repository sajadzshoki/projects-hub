/**
 * Central place for domain constants — easy to extend later.
 * Adding a new status or project type only requires a line here.
 */

export const STATUSES = ["Active", "In Development", "Completed", "Archived"] as const;
export type ProjectStatus = (typeof STATUSES)[number];

export const PROJECT_TYPES = [
  "Web App",
  "Mobile App",
  "Dashboard",
  "Landing Page",
  "Tool",
  "Experiment",
  "Other",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const DEFAULT_STATUS: ProjectStatus = "In Development";
export const DEFAULT_TYPE: ProjectType = "Other";

export const TAG_SUGGESTIONS = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind",
  "MongoDB",
  "Node.js",
  "Vue",
  "Nuxt",
  "Expo",
  "Arena AI",
];

/** Max tags per project (validated server-side too). */
export const MAX_TAGS = 10;

/** Max cover image size in MB (the API reads MAX_UPLOAD_MB env, this is the client-side hint). */
export const MAX_UPLOAD_MB = 5;

/** Status → subtle dot color. Keep the palette restrained. */
export const STATUS_DOT: Record<ProjectStatus, string> = {
  Active: "bg-emerald-400",
  "In Development": "bg-amber-400",
  Completed: "bg-sky-400",
  Archived: "bg-zinc-500",
};

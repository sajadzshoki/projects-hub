import { z, type ZodError } from "zod";
import {
  DEFAULT_STATUS,
  DEFAULT_TYPE,
  MAX_CHECKLIST_ITEMS,
  MAX_CHECKLIST_TEXT,
  MAX_TAGS,
  PROJECT_TYPES,
  STATUSES,
} from "./constants";

/**
 * Server-side validation — never trust the client alone.
 * Empty strings are normalized to `undefined` so optional URL fields can be omitted.
 */

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalHttpUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(500, "URL is too long.")
    .refine(isHttpUrl, "Enter a valid URL starting with http:// or https://")
    .optional()
);

/** Cover images may also be app-relative paths (e.g. /api/uploads/… from direct upload). */
const optionalImageUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(1000, "URL is too long.")
    .refine(
      (v) => isHttpUrl(v) || /^\/[a-zA-Z0-9\-._~/@]+$/,
      "Enter a valid image URL or upload a file."
    )
    .optional()
);

const checklistItemSchema = z.object({
  id: z.string().trim().uuid("Invalid checklist item."),
  text: z
    .string()
    .trim()
    .min(1, "Checklist items cannot be empty.")
    .max(MAX_CHECKLIST_TEXT, `Checklist item is too long (max ${MAX_CHECKLIST_TEXT}).`),
  done: z.boolean(),
});

export const checklistSchema = z
  .array(checklistItemSchema)
  .max(MAX_CHECKLIST_ITEMS, `Too many checklist items (max ${MAX_CHECKLIST_ITEMS}).`)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate checklist item.",
          path: [index, "id"],
        });
      }
      seen.add(item.id);
    });
  });

/** Body for PATCH /api/projects/[id]/checklist — updates only the list. */
export const checklistUpdateSchema = z.object({
  checklist: checklistSchema,
});

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120, "Title is too long (max 120)."),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(2000, "Description is too long (max 2000)."),
  coverImage: optionalImageUrl,
  projectUrl: optionalHttpUrl,
  githubUrl: optionalHttpUrl,
  adminPanelUrl: optionalHttpUrl,
  status: z.enum(STATUSES).default(DEFAULT_STATUS),
  projectType: z.enum(PROJECT_TYPES).default(DEFAULT_TYPE),
  tags: z
    .array(z.string().trim().min(1, "Tags cannot be empty.").max(30, "Tags must be 30 chars or less."))
    .max(MAX_TAGS, `Too many tags (max ${MAX_TAGS}).`)
    .default([]),
  checklist: checklistSchema.default([]),
  favorite: z.boolean().default(false),
  notes: z.string().trim().max(5000, "Notes are too long (max 5000).").default(""),
  aiDocumentation: z
    .string()
    .max(100_000, "AI documentation is too long.")
    .default(""),
});

export type ProjectInput = z.infer<typeof projectSchema>;

/** Flatten a ZodError into { field: message } for the forms to display. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

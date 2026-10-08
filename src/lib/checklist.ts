import type { ChecklistItem } from "./types";
import { createId } from "./utils";

/** Default checklist added to every project once. */
export const DEFAULT_CHECKLIST = [
  "front",
  "back",
  "deploy",
  "data entry",
  "admin",
  "nginx",
  "domain",
  "app export",
] as const;

/** Bump when the default list changes so existing projects pick up new items once. */
export const CHECKLIST_DEFAULTS_VERSION = 1;

const defaultLabels = new Set<string>(DEFAULT_CHECKLIST);

export function defaultChecklist(): ChecklistItem[] {
  return DEFAULT_CHECKLIST.map((text) => ({ id: createId(), text, done: false }));
}

/**
 * Puts the default items first, in order, keeping a matching item's id and done state.
 * Extra items the project already had stay after the defaults.
 */
export function mergeDefaultChecklist(items: ChecklistItem[] | undefined): ChecklistItem[] {
  const byLabel = new Map<string, ChecklistItem>();
  const extras: ChecklistItem[] = [];

  for (const item of items ?? []) {
    const key = item.text.trim().toLowerCase();
    if (defaultLabels.has(key) && !byLabel.has(key)) {
      byLabel.set(key, item);
    } else if (!defaultLabels.has(key)) {
      extras.push(item);
    }
  }

  return [
    ...DEFAULT_CHECKLIST.map(
      (text) => byLabel.get(text) ?? { id: createId(), text, done: false }
    ),
    ...extras,
  ];
}

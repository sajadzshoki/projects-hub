"use client";

import { useState } from "react";
import { PROJECT_TYPES, type ProjectStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import ProjectSort, { type SortKey } from "@/components/projects/ProjectSort";
import { FilterIcon, StarIcon } from "@/components/icons";

export type QuickFilter = "All" | "Favorites" | ProjectStatus;

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "All", label: "All Projects" },
  { value: "Favorites", label: "Favorites" },
  { value: "Active", label: "Active" },
  { value: "In Development", label: "In Development" },
  { value: "Completed", label: "Completed" },
  { value: "Archived", label: "Archived" },
];

interface ProjectFiltersProps {
  quick: QuickFilter;
  type: string;
  tag: string;
  sort: SortKey;
  allTags: string[];
  resultCount: number;
  total: number;
  onQuickChange: (value: QuickFilter) => void;
  onTypeChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onSortChange: (value: SortKey) => void;
  onClear: () => void;
}

function pillClass(active: boolean): string {
  return cn(
    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active
      ? "border-accent/60 bg-accent-soft text-accent-fg"
      : "border-border bg-surface text-muted hover:border-border-strong hover:text-text"
  );
}

/**
 * Filter bar — quick-view pills always visible (horizontally scrollable on mobile),
 * compact selects on desktop, a bottom-sheet panel on small screens.
 */
export default function ProjectFilters(props: ProjectFiltersProps) {
  const {
    quick, type, tag, sort, allTags, resultCount, total,
    onQuickChange, onTypeChange, onTagChange, onSortChange, onClear,
  } = props;
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCount =
    (quick !== "All" ? 1 : 0) + (type !== "All" ? 1 : 0) + (tag !== "All" ? 1 : 0);
  const hasFilters = activeCount > 0;

  const typeSelect = (
    <Select
      value={type}
      onChange={(event) => onTypeChange(event.target.value)}
      aria-label="Filter by project type"
      className={sheetOpen ? "w-full" : "w-36"}
    >
      <option value="All">All types</option>
      {PROJECT_TYPES.map((projectType) => (
        <option key={projectType} value={projectType}>
          {projectType}
        </option>
      ))}
    </Select>
  );

  const tagSelect = (
    <Select
      value={tag}
      onChange={(event) => onTagChange(event.target.value)}
      aria-label="Filter by tag"
      className={sheetOpen ? "w-full" : "w-36"}
      disabled={allTags.length === 0}
    >
      <option value="All">All tags</option>
      {allTags.map((tagName) => (
        <option key={tagName} value={tagName}>
          {tagName}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 py-0.5">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onQuickChange(filter.value)}
              className={pillClass(quick === filter.value)}
            >
              {filter.value === "Favorites" && (
                <StarIcon className="mr-1 inline h-3 w-3 align-[-2px]" />
              )}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Compact controls on desktop */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {typeSelect}
          {tagSelect}
          <ProjectSort value={sort} onChange={onSortChange} className="w-44" />
          {hasFilters && (
            <button
              type="button"
              onClick={onClear}
              className="whitespace-nowrap px-1 text-xs text-muted transition-colors hover:text-text"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sheet trigger on mobile/tablet */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-text lg:hidden"
        >
          <FilterIcon className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="sr-only">Projects</h1>
        <p className="text-xs text-muted">
          {resultCount === total
            ? `${total} ${total === 1 ? "project" : "projects"}`
            : `${resultCount} of ${total} ${total === 1 ? "project" : "projects"}`}
        </p>
      </div>

      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters & sorting">
        <div className="space-y-4">
          <Field label="Sort by">
            <ProjectSort value={sort} onChange={onSortChange} className="w-full" ariaLabel="Sort projects" />
          </Field>
          <Field label="Project type">{typeSelect}</Field>
          <Field label="Tag">{tagSelect}</Field>
          <div className="flex gap-2 pt-1">
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  onClear();
                }}
              >
                Clear all
              </Button>
            )}
            <Button variant="primary" className="flex-1" onClick={() => setSheetOpen(false)}>
              Show {resultCount} {resultCount === 1 ? "result" : "results"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { Select } from "@/components/ui/Field";

export const SORT_OPTIONS = [
  { value: "updated", label: "Recently Updated" },
  { value: "created", label: "Recently Created" },
  { value: "oldest", label: "Oldest" },
  { value: "alpha", label: "Alphabetical" },
  { value: "favorites", label: "Favorites First" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

/** Small sort control. Default is "Recently Updated". */
export default function ProjectSort({
  value,
  onChange,
  className,
  ariaLabel = "Sort projects",
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value as SortKey)}
      aria-label={ariaLabel}
      title="Sort"
      className={className}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

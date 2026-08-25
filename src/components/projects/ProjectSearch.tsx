"use client";

import { cn } from "@/lib/utils";
import { SearchIcon, XIcon } from "@/components/icons";
import { inputClasses } from "@/components/ui/Field";

interface ProjectSearchProps {
  value: string;
  onChange: (value: string) => void;
}

/** Instant client-side search across title, description, tags, type and status. */
export default function ProjectSearch({ value, onChange }: ProjectSearchProps) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search projects…"
        aria-label="Search projects"
        className={cn(inputClasses, "h-9 pr-8")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-muted transition-colors hover:text-text"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

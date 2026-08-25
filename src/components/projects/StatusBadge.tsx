import { STATUS_DOT, type ProjectStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Subtle status badge — a colored dot on a neutral chip, no loud colors. */
export default function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {status}
    </span>
  );
}

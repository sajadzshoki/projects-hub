import { cn } from "@/lib/utils";

/** Compact mono tag chips. Shows at most `max` tags plus a "+N" overflow chip. */
export default function TagList({
  tags,
  max,
  className,
}: {
  tags: string[];
  max?: number;
  className?: string;
}) {
  if (!tags.length) return null;
  const visible = max ? tags.slice(0, max) : tags;
  const overflow = tags.length - visible.length;

  return (
    <div className={cn("flex min-w-0 flex-wrap gap-1", className)}>
      {visible.map((tag) => (
        <span
          key={tag}
          className="max-w-[10rem] truncate rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted"
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted/70">
          +{overflow}
        </span>
      )}
    </div>
  );
}

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Friendly empty state — used for "no projects yet" and "no search results". */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center animate-fade-in">
      {icon && (
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

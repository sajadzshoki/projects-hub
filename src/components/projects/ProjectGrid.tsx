import type { ReactNode } from "react";

/**
 * Responsive project grid — 1 column on mobile, 2 on tablet,
 * 3 on laptop, 4 on large desktop.
 */
export default function ProjectGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {children}
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutIcon, LogoMark, PlusIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";

/**
 * App header — logo on the left; search slot, "Add Project" and logout on the right.
 * On small screens the search input wraps to its own full-width row.
 */
export default function AppHeader({ search }: { search?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-6">
        <Link
          href="/projects"
          className="mr-auto flex items-center gap-2.5 text-text transition-opacity hover:opacity-80"
        >
          <LogoMark className="h-6 w-6 text-accent-fg" />
          <span className="text-sm font-semibold tracking-tight">Project Hub</span>
        </Link>

        {search && (
          <div className="order-last w-full min-w-0 sm:order-none sm:w-64 lg:w-72">{search}</div>
        )}

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
          <Link href="/projects/new" className={buttonClasses({ variant: "primary", size: "sm" })}>
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Add Project</span>
          </Link>
          {/* Plain form POST → /api/auth/logout → 303 redirect to /login. Works without JS. */}
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              title="Log out"
              aria-label="Log out"
              className={buttonClasses({ variant: "ghost", size: "icon-sm" })}
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { ChevronLeftIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">404</p>
      <h1 className="text-lg font-semibold">Project not found</h1>
      <p className="max-w-sm text-sm text-muted">It may have been deleted or the link is wrong.</p>
      <Link href="/projects" className={buttonClasses({ variant: "secondary", className: "mt-2" })}>
        <ChevronLeftIcon className="h-3.5 w-3.5" />
        Back to projects
      </Link>
    </main>
  );
}

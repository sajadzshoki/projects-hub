"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Error</p>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        The page could not be loaded. This is usually a temporary problem — try again.
      </p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}

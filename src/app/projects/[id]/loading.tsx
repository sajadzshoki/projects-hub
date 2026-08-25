export default function ProjectDetailLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="h-6 w-32 animate-pulse rounded bg-surface-2" />
        </div>
      </div>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-6">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="aspect-[21/9] animate-pulse bg-surface-2" />
          <div className="space-y-4 p-5 md:p-7">
            <div className="h-6 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="flex gap-2">
              <div className="h-9 w-32 animate-pulse rounded-md bg-surface-2" />
              <div className="h-9 w-24 animate-pulse rounded-md bg-surface-2" />
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
            <div className="h-32 w-full animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      </main>
    </div>
  );
}

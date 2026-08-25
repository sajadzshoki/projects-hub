import { SkeletonGrid } from "@/components/ui/Skeleton";

export default function ProjectsLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="h-6 w-32 animate-pulse rounded bg-surface-2" />
          <div className="flex gap-2">
            <div className="h-9 w-56 animate-pulse rounded-md bg-surface-2" />
            <div className="hidden h-8 w-28 animate-pulse rounded-md bg-surface-2 sm:block" />
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 md:px-6">
        <div className="mb-3 h-7 w-full max-w-xl animate-pulse rounded-full bg-surface-2" />
        <SkeletonGrid />
      </main>
    </div>
  );
}

/** Tiny transient feedback message (bottom center). */
export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-slide-up rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text shadow-xl">
      {message}
    </div>
  );
}

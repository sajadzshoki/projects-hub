"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { StarIcon } from "@/components/icons";

interface FavoriteButtonProps {
  projectId: string;
  favorite: boolean;
  /** "overlay" = on top of a cover image, "plain" = on a surface (detail page). */
  variant?: "overlay" | "plain";
  className?: string;
  onToggle?: (favorite: boolean) => void;
}

/** Star toggle — optimistic update, reverts if the request fails. */
export default function FavoriteButton({
  projectId,
  favorite,
  variant = "overlay",
  className,
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(favorite);
  const [busy, setBusy] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const next = !isFavorite;
    setIsFavorite(next);
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/favorite`, { method: "POST" });
      if (!response.ok) throw new Error("Request failed");
      const data = (await response.json()) as { favorite: boolean };
      setIsFavorite(data.favorite);
      onToggle?.(data.favorite);
    } catch {
      setIsFavorite(!next); // revert
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "grid place-items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        variant === "overlay"
          ? "h-8 w-8 rounded-full bg-black/55 text-zinc-300 backdrop-blur-[2px] hover:bg-black/75 hover:text-amber-300"
          : "h-9 w-9 rounded-md border border-border bg-surface-2 text-muted hover:border-border-strong hover:text-amber-300",
        className
      )}
    >
      <StarIcon
        className={cn(
          "h-4 w-4 transition-transform duration-150 active:scale-75",
          isFavorite && "scale-110 fill-amber-400 text-amber-400"
        )}
      />
    </button>
  );
}

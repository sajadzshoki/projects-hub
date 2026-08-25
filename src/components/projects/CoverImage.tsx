"use client";

import { useState } from "react";
import { cn, initialOf } from "@/lib/utils";

interface CoverImageProps {
  src: string | null;
  alt: string;
  title: string;
  /** Tailwind sizing classes for the wrapper, e.g. "aspect-video" or "aspect-[21/9]". */
  className?: string;
}

/**
 * Cover image with a clean placeholder fallback.
 * Falls back gracefully if the image fails to load (e.g. offline external URL).
 */
export default function CoverImage({ src, alt, title, className }: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center bg-surface-2",
          className
        )}
      >
        <span className="select-none font-mono text-4xl text-muted/40">{initialOf(title)}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- covers are arbitrary user URLs / local uploads
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("w-full object-cover", className)}
    />
  );
}

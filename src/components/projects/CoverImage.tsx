"use client";

import { useEffect, useState } from "react";
import { cn, initialOf } from "@/lib/utils";

interface CoverImageProps {
  src: string | null;
  alt: string;
  title: string;
  /** Tailwind sizing classes for the wrapper, e.g. "aspect-video" or "aspect-[21/9]". */
  className?: string;
  /**
   * Project website. When set, its preview image (og:image) is preferred.
   * `src` is only used when the site has no preview image or that image fails.
   */
  siteUrl?: string | null;
}

const cache = new Map<string, string | null>();
let queued: Array<{ url: string; resolve: (image: string | null) => void }> = [];
let flushTimer: number | null = null;

function readSiteImage(siteUrl: string): Promise<string | null> {
  if (cache.has(siteUrl)) return Promise.resolve(cache.get(siteUrl) ?? null);
  return new Promise((resolve) => {
    queued.push({ url: siteUrl, resolve });
    if (flushTimer === null) flushTimer = window.setTimeout(flushSiteImages, 40);
  });
}

async function flushSiteImages() {
  flushTimer = null;
  const batch = queued;
  queued = [];
  const urls = [...new Set(batch.map((item) => item.url))];
  let images: Record<string, string | null> = {};
  try {
    const response = await fetch("/api/site-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (response.ok) {
      const data = (await response.json()) as { images?: Record<string, string | null> };
      images = data.images ?? {};
    }
  } catch {
    images = {};
  }
  for (const url of urls) cache.set(url, images[url] ?? null);
  for (const item of batch) item.resolve(cache.get(item.url) ?? null);
}

/**
 * Cover image with a clean placeholder fallback.
 * Prefers the preview image read from the project website, then a stored cover.
 */
export default function CoverImage({ src, alt, title, className, siteUrl }: CoverImageProps) {
  const [siteImage, setSiteImage] = useState<string | null>(null);
  const [siteFailed, setSiteFailed] = useState(false);
  const [srcFailed, setSrcFailed] = useState(false);

  const page = siteUrl?.trim() ?? "";
  const canReadSite = /^https?:\/\//i.test(page);

  useEffect(() => {
    setSiteImage(null);
    setSiteFailed(false);
    setSrcFailed(false);
    if (!canReadSite) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void readSiteImage(page).then((image) => {
        if (!cancelled) setSiteImage(image);
      });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, canReadSite]);

  const showSite = Boolean(siteImage) && !siteFailed;
  const shown = showSite ? siteImage : src && !srcFailed ? src : null;

  if (!shown) {
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
    // eslint-disable-next-line @next/next/no-img-element -- covers are arbitrary site and upload URLs
    <img
      key={shown}
      src={shown}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (showSite) setSiteFailed(true);
        else setSrcFailed(true);
      }}
      className={cn("w-full object-cover", className)}
    />
  );
}

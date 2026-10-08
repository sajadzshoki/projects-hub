import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Reads a page's preview image (Open Graph / Twitter card) so a project's
 * cover can come from the project website itself.
 *
 * The hub fetches only public http(s) pages. Private, link-local and
 * single-label hosts are rejected so a project URL cannot be used to
 * probe the server's network.
 */

const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000;
const MISS_TTL_MS = 10 * 60 * 1000;
const MAX_HTML_BYTES = 350_000;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 5000;
const MAX_BATCH = 8;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const PREVIEW_KEYS = [
  "og:image",
  "og:image:secure_url",
  "og:image:url",
  "twitter:image",
  "twitter:image:src",
];

interface CacheEntry {
  image: string | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, num: string) => {
      const code = Number(num);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`, "i")
  );
  const raw = match?.[1] ?? match?.[2] ?? match?.[3];
  if (!raw) return null;
  const value = decodeEntities(raw).trim();
  return value || null;
}

function toAbsolute(base: URL, value: string): string | null {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

/** Pulls the first preview image URL out of an HTML document. */
export function extractPreviewImage(html: string, pageUrl: string): string | null {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return null;
  }

  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const key of PREVIEW_KEYS) {
    for (const tag of metas) {
      const prop = (
        attribute(tag, "property") ??
        attribute(tag, "name") ??
        attribute(tag, "itemprop")
      )?.toLowerCase();
      if (prop !== key) continue;
      const content = attribute(tag, "content");
      if (!content) continue;
      const absolute = toAbsolute(base, content);
      if (absolute) return absolute;
    }
  }

  const image = jsonLdImage(html);
  return image ? toAbsolute(base, image) : null;
}

function jsonLdImage(html: string): string | null {
  const blocks =
    html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const block of blocks) {
    const json = block.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const found = findImage(JSON.parse(json));
      if (found) return found;
    } catch {
      // Broken JSON-LD is common; the meta tags are the primary source.
    }
  }
  return null;
}

function findImage(data: unknown, depth = 0): string | null {
  if (!data || typeof data !== "object" || depth > 4) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findImage(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = data as Record<string, unknown>;
  const image = record.image ?? record.thumbnailUrl;
  if (typeof image === "string" && image.trim()) return image.trim();
  if (Array.isArray(image)) {
    for (const item of image) {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string") {
        const url = (item as { url: string }).url.trim();
        if (url) return url;
      }
    }
  }
  if (image && typeof image === "object" && typeof (image as { url?: unknown }).url === "string") {
    const url = (image as { url: string }).url.trim();
    if (url) return url;
  }

  if (Array.isArray(record["@graph"])) return findImage(record["@graph"], depth + 1);
  return null;
}

function isBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^::ffff:/, "");
  if (normalized.includes(".")) {
    const parts = normalized.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0) return true;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
    if (a === 203 && b === 0) return true;
    if (a >= 224) return true;
    return false;
  }

  if (normalized === "::1" || normalized === "::") return true;
  if (/^f[cd]/i.test(normalized)) return true;
  if (/^fe[89ab]/i.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;
  return false;
}

async function isPublicHttpUrl(value: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) return false;
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  ) {
    return false;
  }
  if (/^\d+$/.test(hostname)) return false;

  if (isIP(hostname)) return !isBlockedIp(hostname);
  if (!hostname.includes(".")) return false;

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return false;
    return records.every((record) => !isBlockedIp(record.address));
  } catch {
    return false;
  }
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8");
  let size = 0;
  let html = "";
  while (size < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    size += value.byteLength;
    html += decoder.decode(value, { stream: true });
  }
  html += decoder.decode();
  await reader.cancel().catch(() => undefined);
  return html;
}

async function loadPage(pageUrl: string): Promise<string | null> {
  let current = pageUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isPublicHttpUrl(current))) return null;
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": BROWSER_UA,
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location || hop === MAX_REDIRECTS) return null;
      current = new URL(location, current).href;
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }

    const type = response.headers.get("content-type") ?? "";
    if (type.startsWith("image/")) {
      await response.body?.cancel().catch(() => undefined);
      return current;
    }
    if (type && !/text\/html|application\/xhtml\+xml/i.test(type)) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }

    const html = await readLimited(response);
    const image = extractPreviewImage(html, current);
    if (!image || !(await isPublicHttpUrl(image))) return null;
    return image;
  }
  return null;
}

async function loadSiteImage(pageUrl: string): Promise<string | null> {
  try {
    return await loadPage(pageUrl);
  } catch {
    return null;
  }
}

/** Preview image for one public page, or null when the site has none. Cached in memory. */
export function fetchSiteImage(pageUrl: string): Promise<string | null> {
  const key = pageUrl.trim();
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.image);

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = loadSiteImage(key)
    .then((image) => {
      cache.set(key, {
        image,
        expires: Date.now() + (image ? SUCCESS_TTL_MS : MISS_TTL_MS),
      });
      return image;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, task);
  return task;
}

/** Resolves many project URLs at once, with a small concurrency cap. */
export async function fetchSiteImages(urls: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  const images: Record<string, string | null> = {};
  let index = 0;

  async function worker() {
    while (index < unique.length) {
      const url = unique[index++];
      images[url] = await fetchSiteImage(url);
    }
  }

  const workers = Math.min(MAX_BATCH, unique.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return images;
}

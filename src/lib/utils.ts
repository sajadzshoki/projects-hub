/** Tiny class-name joiner (keeps us dependency-free). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * A UUID v4. `crypto.randomUUID` only exists in secure contexts, so it works on
 * localhost and HTTPS but throws on plain HTTP (the server's IP). `getRandomValues`
 * is available there.
 */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** "just now" / "3 min ago" / "2 days ago" / "Aug 25, 2026" */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return "";
  const diff = Date.now() - date;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return formatDate(iso);
}

/** "Aug 25, 2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** First letter of a title, used for cover placeholders. */
export function initialOf(title: string): string {
  return (title.trim().charAt(0) || "?").toUpperCase();
}

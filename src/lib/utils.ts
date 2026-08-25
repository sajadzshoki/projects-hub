/** Tiny class-name joiner (keeps us dependency-free). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
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

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------- Date Formatting ----------

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "TBA";
  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch {
    return "TBA";
  }
}

export function formatRelativeDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
}

export function formatEpisodeCode(
  season?: number | null,
  episode?: number | null
): string {
  if (!season && !episode) return "";
  const s = season ? `S${String(season).padStart(2, "0")}` : "";
  const e = episode ? `E${String(episode).padStart(2, "0")}` : "";
  return `${s}${e}`;
}

export function formatTimeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

// ---------- Image helpers ----------

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" | "w780" | "original" = "w342"
): string {
  if (!path) return "/placeholder-poster.svg";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(
  path: string | null | undefined,
  size: "w780" | "w1280" | "original" = "w1280"
): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function stillUrl(
  path: string | null | undefined,
  size: "w185" | "w300" | "original" = "w300"
): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// ---------- Misc ----------

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "\u2026";
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

import { cn } from "@/lib/utils";
import { StarIcon } from "@/lib/icons";
import type { ShowRatings } from "@/types";

interface ShowRatingProps {
  ratings: ShowRatings | null;
  className?: string;
  compact?: boolean;
}

const RATING_CONFIGS: {
  key: string;
  label: string;
  glyph: string;
  color: string;
  suffix?: string;
}[] = [
  { key: "imdb_rating", label: "IMDb", glyph: "★", color: "text-amber-400" },
  {
    key: "rotten_tomatoes",
    label: "RT",
    glyph: "🍅",
    color: "text-red-400",
    suffix: "%",
  },
  { key: "metascore", label: "Meta", glyph: "M", color: "text-green-400" },
];

export function ShowRating({ ratings, className, compact = false }: ShowRatingProps) {
  if (!ratings) return null;

  const available = RATING_CONFIGS.filter(
    (r) => ratings[r.key] && ratings[r.key] !== "N/A"
  );
  if (available.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {available.map(({ key, label, glyph, color, suffix }) => (
        <div
          key={key}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 px-2.5 py-1.5",
            compact && "gap-1.5 px-2 py-1"
          )}
        >
          <span className={cn("text-sm leading-none", color, compact && "text-xs")}>
            {glyph}
          </span>
          <div className="flex flex-col leading-none">
            {!compact && (
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
            )}
            <span
              className={cn(
                "font-semibold tabular-nums",
                compact ? "text-xs" : "mt-0.5 text-sm"
              )}
            >
              {ratings[key]}
              {suffix}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Inline single-rating display for cards. */
export function InlineRating({
  rating,
  className,
}: {
  rating: string | undefined;
  className?: string;
}) {
  if (!rating || rating === "N/A") return null;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <StarIcon weight="Filled" className="size-3 text-amber-400" />
      <span className="text-xs font-medium tabular-nums">{rating}</span>
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { ShowRatings } from "@/types";
import { Star } from "lucide-react";

interface ShowRatingProps {
  ratings: ShowRatings | null;
  className?: string;
  compact?: boolean;
}

const RATING_CONFIGS: {
  key: string;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    key: "imdb_rating",
    label: "IMDb",
    icon: "★",
    color: "text-amber-400",
  },
  {
    key: "rotten_tomatoes",
    label: "RT",
    icon: "🍅",
    color: "text-red-400",
  },
  {
    key: "metascore",
    label: "Meta",
    icon: "M",
    color: "text-green-400",
  },
];

export function ShowRating({ ratings, className, compact = false }: ShowRatingProps) {
  if (!ratings) return null;

  const available = RATING_CONFIGS.filter(
    (r) => ratings[r.key] && ratings[r.key] !== "N/A"
  );

  if (available.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {available.map(({ key, label, icon, color }) => (
        <div
          key={key}
          className={cn(
            "flex items-center gap-1.5",
            compact && "gap-1"
          )}
        >
          <span className={cn("text-sm", color, compact && "text-xs")}>
            {icon}
          </span>
          <div className="flex flex-col">
            {!compact && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
            )}
            <span
              className={cn(
                "font-semibold tabular-nums",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {ratings[key]}
              {key === "rotten_tomatoes" && "%"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Inline single-rating display for cards */
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
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span className="text-xs font-medium tabular-nums">{rating}</span>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { AppImage as Image } from "@/components/app-image";
import { cn, posterUrl, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MovieIcon, ShowIcon, StarIcon } from "@/lib/icons";
import type { Show, ShowSearchResult, TrackedShowResponse } from "@/types";

type AnyShow = Show | ShowSearchResult | TrackedShowResponse;

interface ShowCardProps {
  show: AnyShow;
  className?: string;
  /** Animation delay index for staggered reveals. */
  index?: number;
  /** Slot rendered over the poster (favourite/settings controls). */
  overlay?: React.ReactNode;
}

function isTrackedShow(show: AnyShow): show is TrackedShowResponse {
  return "show_id" in show;
}

function isSearchResult(show: AnyShow): show is ShowSearchResult {
  return "year" in show;
}

const STATUS_STYLES: Record<string, string> = {
  "Returning Series": "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Ended: "bg-red-500/15 text-red-300 border-red-500/25",
  Canceled: "bg-red-500/15 text-red-300 border-red-500/25",
  "In Production": "bg-blue-500/15 text-blue-300 border-blue-500/25",
  Planned: "bg-violet-500/15 text-violet-300 border-violet-500/25",
};

/** Long status names blow out a 2-up card on a 360px screen. */
const STATUS_SHORT: Record<string, string> = {
  "Returning Series": "Airing",
  "In Production": "Production",
};

export function ShowCard({ show, className, index = 0, overlay }: ShowCardProps) {
  const tracked = isTrackedShow(show);
  const search = isSearchResult(show);

  const id = tracked ? show.show_id : show.id;
  const title = tracked ? show.show_title : show.title;
  const poster = show.poster_url;
  const status = tracked ? show.status : search ? null : show.status;
  const genres = tracked || search ? null : show.genres;
  const premiereDate = !tracked && !search ? show.premiere_date : null;
  const mediaType = tracked ? null : show.media_type;

  // A search hit that isn't in the local catalog yet routes through the
  // import screen, which creates it on first view.
  const linkTarget =
    search && !id
      ? {
          to: "/shows/import/$mediaType/$tmdbId" as const,
          params: { mediaType: show.media_type, tmdbId: String(show.tmdb_id) },
        }
      : { to: "/shows/$id" as const, params: { id: String(id) } };

  const delay = Math.min(index, 6);
  const FallbackIcon = mediaType === "movie" ? MovieIcon : ShowIcon;
  const subtitle = search && show.year ? show.year : premiereDate ? formatDate(premiereDate) : null;

  return (
    <article className={cn("group relative animate-fade-in", `stagger-${delay}`, className)}>
      <Link
        {...linkTarget}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card press",
          "transition-colors duration-300 can-hover:hover:border-primary/40",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        )}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
          {poster ? (
            <Image
              src={posterUrl(poster, "w342")}
              alt=""
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
              className="object-cover transition-transform duration-500 can-hover:group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FallbackIcon className="size-8 text-muted-foreground/25" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />

          {tracked && show.is_favorite && (
            <span
              className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
              title="Favourite"
            >
              <StarIcon weight="Filled" className="size-3.5 text-primary" />
              <span className="sr-only">Favourite</span>
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight tracking-tight sm:text-sm">
            {title}
          </h3>

          <div className="mt-auto flex flex-wrap items-center gap-1">
            {status && (
              <Badge
                variant="outline"
                className={cn(
                  "px-1.5 py-0 text-[10px] font-medium",
                  STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
                )}
              >
                {STATUS_SHORT[status] ?? status}
              </Badge>
            )}
            {/* One genre on a phone, two once the card is wider. */}
            {genres?.slice(0, 2).map((g, i) => (
              <Badge
                key={g}
                variant="secondary"
                className={cn("px-1.5 py-0 text-[10px]", i === 1 && "hidden sm:inline-flex")}
              >
                {g}
              </Badge>
            ))}
          </div>

          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </Link>

      {/* Controls live outside the <Link> so they're real buttons, not nested
          interactive content inside an anchor. */}
      {overlay}
    </article>
  );
}

export function ShowCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="aspect-[2/3] w-full animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-2.5 sm:p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

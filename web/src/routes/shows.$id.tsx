import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AppImage as Image } from "@/components/app-image";
import { useShowDetail, useSeasonDetail } from "@/hooks/use-shows";
import { ShowRating } from "@/components/show-rating";
import { TrackingToggle } from "@/components/tracking-toggle";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { StreamingProviders } from "@/components/streaming-providers";
import { Showtimes } from "@/components/showtimes";
import { EmptyState } from "@/components/page-shell";
import { BouncyAccordion } from "@/components/motion/bouncy-accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  NetworkIcon,
  SeasonIcon,
} from "@/lib/icons";
import {
  backdropUrl,
  posterUrl,
  formatDate,
  formatEpisodeCode,
  cn,
} from "@/lib/utils";
import type { Season } from "@/types";

export const Route = createFileRoute("/shows/$id")({
  component: ShowDetailPage,
});

function ShowDetailPage() {
  const params = Route.useParams();
  const { data: show, isLoading } = useShowDetail(params.id);
  const [openSeason, setOpenSeason] = useState<string | null>(null);

  if (isLoading) return <ShowDetailSkeleton />;

  if (!show) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <EmptyState
          icon={AlertIcon}
          title="Show not found"
          description="That title isn't in the catalog — it may have been removed."
          actionLabel="Back to search"
          actionTo="/shows/search"
        />
      </div>
    );
  }

  const backdrop = backdropUrl(show.backdrop_url);
  const seasons = show.seasons
    ? [...show.seasons].sort((a, b) => a.season_number - b.season_number)
    : [];

  return (
    <div className="animate-fade-in">
      <div className="relative">
        {backdrop ? (
          <div className="relative h-52 w-full overflow-hidden sm:h-64 md:h-80">
            <Image
              src={backdrop}
              alt=""
              fill
              priority
              className="object-cover object-top"
              sizes="100vw"
            />
            {/* Two stacked gradients: vertical for the text below, horizontal
                so the poster edge doesn't fight the artwork. */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          </div>
        ) : (
          <div className="h-16 md:h-6" />
        )}

        <BackButton floating={Boolean(backdrop)} />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <div
          className={cn(
            "flex gap-4 sm:gap-6",
            backdrop ? "relative z-10 -mt-20 sm:-mt-24" : "pt-2"
          )}
        >
          <div className="w-24 shrink-0 sm:w-36 md:w-44">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/50 shadow-2xl">
              {show.poster_url ? (
                <Image
                  src={posterUrl(show.poster_url, "w500")}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 96px, 176px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted">
                  <SeasonIcon className="size-7 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </div>

          {/* Pushed down so the title clears the poster's top edge on phones. */}
          <div className="min-w-0 flex-1 self-end pb-1 sm:self-auto sm:pb-0">
            <h1 className="font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl md:text-3xl">
              {show.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
              {show.media_type && (
                <Badge variant="outline" className="text-[10px] capitalize sm:text-xs">
                  {show.media_type}
                </Badge>
              )}
              {show.status && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  {show.status}
                </Badge>
              )}
              {show.network && (
                <span className="flex items-center gap-1">
                  <NetworkIcon className="size-3.5" />
                  {show.network}
                </span>
              )}
              {show.premiere_date && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3.5" />
                  {formatDate(show.premiere_date)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Genres, ratings and actions move below the poster row on phones so
            they get full width instead of a ~40% column. */}
        <div className="mt-4 space-y-4 sm:mt-5">
          {show.genres && show.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {show.genres.map((g) => (
                <Badge key={g} variant="secondary" className="text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          <ShowRating ratings={show.ratings} />

          {/* Full-width stacked CTAs on a phone; inline once there's room. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <TrackingToggle showId={show.id} tmdbId={show.tmdb_id} />
            <AddToWatchlistButton showId={show.id} />
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
          {/* Where to watch outranks the episode list on a phone, so it comes
              first in DOM order and is moved back to the rail on desktop. */}
          <aside className="order-1 space-y-6 lg:order-2">
            <StreamingProviders showId={show.id} />
            <Showtimes showId={show.id} mediaType={show.media_type} />
          </aside>

          <div className="order-2 min-w-0 space-y-8 lg:order-1">
            {show.overview && (
              <section>
                <h2 className="mb-2 font-display text-lg font-semibold">
                  Overview
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {show.overview}
                </p>
              </section>
            )}

            {seasons.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                  <SeasonIcon weight="Filled" className="size-5 text-primary" />
                  Seasons
                  <span className="text-sm font-normal tabular-nums text-muted-foreground">
                    {seasons.length}
                  </span>
                </h2>

                <BouncyAccordion
                  value={openSeason}
                  onValueChange={setOpenSeason}
                  collapsible
                  classNames={{
                    item: "rounded-xl border border-border/50 bg-card overflow-hidden",
                    trigger: "px-4 py-3 touch-target",
                  }}
                  items={seasons.map((season) => ({
                    id: season.id,
                    title: <SeasonTitle season={season} />,
                    // Only the open season's panel is built, so its episode
                    // query doesn't fire until it's actually needed.
                    description:
                      openSeason === season.id ? (
                        <SeasonEpisodes
                          showId={show.id}
                          season={season}
                        />
                      ) : null,
                  }))}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackButton({ floating }: { floating: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.history.back()}
      aria-label="Go back"
      className={cn(
        "flex size-10 touch-target items-center justify-center rounded-full press",
        floating
          ? "absolute left-4 top-4 z-20 bg-black/50 text-white backdrop-blur-sm"
          : "ml-4 mt-4 bg-muted text-foreground sm:ml-6"
      )}
    >
      <ArrowLeftIcon className="size-5" />
    </button>
  );
}

function SeasonTitle({ season }: { season: Season }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {season.poster_url && (
        <span className="relative block h-12 w-8 shrink-0 overflow-hidden rounded">
          <Image
            src={posterUrl(season.poster_url, "w185")}
            alt=""
            fill
            className="object-cover"
            sizes="32px"
          />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {season.name ?? `Season ${season.season_number}`}
        </span>
        <span className="block text-xs font-normal text-muted-foreground">
          {season.episode_count ?? season.episodes?.length ?? 0} episodes
          {season.air_date && ` · ${formatDate(season.air_date)}`}
        </span>
      </span>
    </span>
  );
}

function SeasonEpisodes({
  showId,
  season,
}: {
  showId: string;
  season: Season;
}) {
  const { data: fullSeason, isLoading } = useSeasonDetail(
    showId,
    season.season_number
  );
  const episodes = fullSeason?.episodes ?? season.episodes ?? [];

  if (isLoading && episodes.length === 0) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <p className="py-3 text-sm text-muted-foreground">
        No episodes listed yet.
      </p>
    );
  }

  return (
    <ul className="-mx-1 divide-y divide-border/30">
      {episodes.map((ep) => (
        <li key={ep.id} className="flex items-start gap-3 px-1 py-2.5">
          <span className="w-11 shrink-0 pt-0.5 text-center font-mono text-[11px] text-muted-foreground">
            {formatEpisodeCode(ep.season_number, ep.episode_number)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-foreground">
              {ep.title ?? "TBA"}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {ep.air_date && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  {formatDate(ep.air_date)}
                </span>
              )}
              {ep.runtime_minutes && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3" />
                  {ep.runtime_minutes}m
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ShowDetailSkeleton() {
  return (
    <div>
      <div className="h-52 w-full animate-pulse bg-muted sm:h-64 md:h-80" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative z-10 -mt-20 flex gap-4 sm:-mt-24 sm:gap-6">
          <Skeleton className="aspect-[2/3] w-24 shrink-0 rounded-xl sm:w-36 md:w-44" />
          <div className="flex-1 space-y-3 self-end pb-1">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-11 w-full sm:w-48" />
        </div>
      </div>
    </div>
  );
}

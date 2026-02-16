"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useShowDetail, useSeasonDetail } from "@/hooks/use-shows";
import { ShowRating } from "@/components/show-rating";
import { TrackingToggle } from "@/components/tracking-toggle";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { StreamingProviders } from "@/components/streaming-providers";
import { Showtimes } from "@/components/showtimes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  backdropUrl,
  posterUrl,
  formatDate,
  formatEpisodeCode,
  cn,
} from "@/lib/utils";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Layers,
} from "lucide-react";
import type { Season } from "@/types";

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: show, isLoading } = useShowDetail(params.id);

  if (isLoading) return <ShowDetailSkeleton />;
  if (!show) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Show not found.</p>
      </div>
    );
  }

  const backdrop = backdropUrl(show.backdrop_url);

  return (
    <div className="animate-fade-in">
      {/* Backdrop hero */}
      {backdrop && (
        <div className="relative h-48 w-full overflow-hidden sm:h-64 md:h-80">
          <Image
            src={backdrop}
            alt={show.title}
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 pb-10">
        {/* Show info header */}
        <div
          className={cn(
            "flex flex-col gap-6 sm:flex-row",
            backdrop ? "-mt-24 relative z-10" : "pt-6"
          )}
        >
          {/* Poster */}
          <div className="shrink-0">
            <div className="relative aspect-[2/3] w-36 overflow-hidden rounded-xl border border-border/50 shadow-2xl sm:w-44">
              {show.poster_url ? (
                <Image
                  src={posterUrl(show.poster_url, "w500")}
                  alt={show.title}
                  fill
                  className="object-cover"
                  sizes="176px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted">
                  <span className="text-3xl text-muted-foreground/30">?</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                {show.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {show.media_type && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {show.media_type}
                  </Badge>
                )}
                {show.status && (
                  <Badge variant="secondary" className="text-xs">
                    {show.status}
                  </Badge>
                )}
                {show.network && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {show.network}
                  </span>
                )}
                {show.premiere_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(show.premiere_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {show.genres.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            )}

            {/* Ratings */}
            <ShowRating ratings={show.ratings} />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <TrackingToggle
                showId={show.id}
                tmdbId={show.tmdb_id}
              />
              <AddToWatchlistButton showId={show.id} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-8">
            {/* Overview */}
            {show.overview && (
              <div>
                <h2 className="font-display text-lg font-semibold mb-2">Overview</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {show.overview}
                </p>
              </div>
            )}

            <Separator />

            {/* Seasons */}
            {show.seasons && show.seasons.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Seasons ({show.seasons.length})
                </h2>
                <div className="space-y-3">
                  {show.seasons
                    .sort((a, b) => a.season_number - b.season_number)
                    .map((season) => (
                      <SeasonAccordion
                        key={season.id}
                        season={season}
                        showId={show.id}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <StreamingProviders showId={show.id} />
            <Showtimes showId={show.id} mediaType={show.media_type} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Season Accordion ----------
function SeasonAccordion({
  season,
  showId,
}: {
  season: Season;
  showId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: fullSeason, isLoading } = useSeasonDetail(
    showId,
    isOpen ? season.season_number : 0
  );

  const episodes = fullSeason?.episodes ?? season.episodes ?? [];

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {season.poster_url && (
            <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded">
              <Image
                src={posterUrl(season.poster_url, "w185")}
                alt={season.name ?? `Season ${season.season_number}`}
                fill
                className="object-cover"
                sizes="32px"
              />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold">
              {season.name ?? `Season ${season.season_number}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {season.episode_count ?? episodes.length} episodes
              {season.air_date && ` \u00B7 ${formatDate(season.air_date)}`}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border/50">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : episodes.length > 0 ? (
            <div className="divide-y divide-border/30">
              {episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="w-10 shrink-0 text-center text-xs font-mono text-muted-foreground">
                    {formatEpisodeCode(ep.season_number, ep.episode_number)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {ep.title ?? "TBA"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {ep.air_date && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(ep.air_date)}
                        </span>
                      )}
                      {ep.runtime_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ep.runtime_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No episodes available yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Skeleton ----------
function ShowDetailSkeleton() {
  return (
    <div>
      <div className="h-48 w-full animate-pulse bg-muted sm:h-64 md:h-80" />
      <div className="mx-auto max-w-5xl px-4 -mt-24 relative z-10">
        <div className="flex flex-col gap-6 sm:flex-row">
          <Skeleton className="aspect-[2/3] w-36 rounded-xl sm:w-44" />
          <div className="flex-1 space-y-3 pt-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { cn, posterUrl, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Show, TrackedShowResponse } from "@/types";

interface ShowCardProps {
  show: Show | TrackedShowResponse;
  className?: string;
  /** If provided, render as a link to this URL */
  href?: string;
  /** Animation delay index for staggered reveals */
  index?: number;
}

function isTrackedShow(
  show: Show | TrackedShowResponse
): show is TrackedShowResponse {
  return "show_id" in show;
}

export function ShowCard({ show, className, href, index = 0 }: ShowCardProps) {
  const id = isTrackedShow(show) ? show.show_id : show.id;
  const title = isTrackedShow(show) ? show.show_title : show.title;
  const poster = isTrackedShow(show) ? show.poster_url : show.poster_url;
  const status = isTrackedShow(show) ? show.status : show.status;
  const genres = isTrackedShow(show) ? null : show.genres;

  const linkHref = href ?? `/shows/${id}`;
  const delay = Math.min(index, 6);

  const statusColor: Record<string, string> = {
    "Returning Series": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Ended": "bg-red-500/20 text-red-400 border-red-500/30",
    "Canceled": "bg-red-500/20 text-red-400 border-red-500/30",
    "In Production": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Planned": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  };

  return (
    <Link
      href={linkHref}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl bg-card border border-border/50 transition-all duration-300",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        "animate-fade-in",
        `stagger-${delay}`,
        className
      )}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {poster ? (
          <Image
            src={posterUrl(poster, "w342")}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-3xl text-muted-foreground/30">?</span>
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />

        {/* Favorite indicator */}
        {isTrackedShow(show) && show.is_favorite && (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <span className="text-sm">&#9733;</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight tracking-tight">
          {title}
        </h3>

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {status && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0",
                statusColor[status] ?? "bg-muted text-muted-foreground"
              )}
            >
              {status}
            </Badge>
          )}
          {genres?.slice(0, 2).map((g) => (
            <Badge
              key={g}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {g}
            </Badge>
          ))}
        </div>

        {!isTrackedShow(show) && show.premiere_date && (
          <p className="text-[11px] text-muted-foreground">
            {formatDate(show.premiere_date)}
          </p>
        )}
      </div>
    </Link>
  );
}

// ---------- Skeleton for loading states ----------
export function ShowCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-card border border-border/50">
      <div className="aspect-[2/3] w-full animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

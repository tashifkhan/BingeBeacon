"use client";

import { cn, formatRelativeDate, formatEpisodeCode } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tv, Film, CalendarCheck, RefreshCw, AlertCircle } from "lucide-react";
import type { TimelineEvent } from "@/types";

interface TimelineEventCardProps {
  event: TimelineEvent;
  className?: string;
  index?: number;
}

const EVENT_TYPE_CONFIG: Record<
  string,
  { icon: typeof Tv; color: string; label: string }
> = {
  new_episode: {
    icon: Tv,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    label: "New Episode",
  },
  new_season: {
    icon: CalendarCheck,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    label: "New Season",
  },
  premiere: {
    icon: Film,
    color: "text-primary bg-primary/10 border-primary/20",
    label: "Premiere",
  },
  status_change: {
    icon: RefreshCw,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    label: "Status Change",
  },
};

const DEFAULT_CONFIG = {
  icon: AlertCircle,
  color: "text-muted-foreground bg-muted border-border",
  label: "Event",
};

export function TimelineEventCard({
  event,
  className,
  index = 0,
}: TimelineEventCardProps) {
  const config = EVENT_TYPE_CONFIG[event.event_type] ?? DEFAULT_CONFIG;
  const Icon = config.icon;
  const episodeCode = formatEpisodeCode(
    event.season_number,
    event.episode_number
  );
  const delay = Math.min(index, 6);

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200",
        "hover:border-border hover:bg-card/80",
        "animate-fade-in",
        `stagger-${delay}`,
        className
      )}
    >
      {/* Event type icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
          config.color
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              {event.show_title}
            </p>
            <p className="text-sm text-muted-foreground leading-tight mt-0.5">
              {event.title}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[10px] px-1.5 py-0", config.color)}
          >
            {episodeCode || config.label}
          </Badge>
        </div>

        {event.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground/80">
            {event.description}
          </p>
        )}

        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
          {formatRelativeDate(event.event_date)}
        </p>
      </div>
    </div>
  );
}

export function TimelineEventSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-border/50 bg-card p-4">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

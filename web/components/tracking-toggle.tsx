"use client";

import { Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrackShow, useUntrackShow, useTrackedShows } from "@/hooks/use-tracking";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface TrackingToggleProps {
  showId: string;
  tmdbId?: number | null;
  className?: string;
  /** Variant: "icon" for icon-only, "full" for button with text */
  variant?: "icon" | "full";
}

export function TrackingToggle({
  showId,
  tmdbId,
  className,
  variant = "full",
}: TrackingToggleProps) {
  const { isAuthenticated } = useAuth();
  const { data: tracked } = useTrackedShows();
  const trackShow = useTrackShow();
  const untrackShow = useUntrackShow();

  const isTracked = tracked?.some((t) => t.show_id === showId) ?? false;
  const isPending = trackShow.isPending || untrackShow.isPending;

  function handleToggle() {
    if (!isAuthenticated) {
      // Could redirect to login, but we'll let the nav bar handle that
      return;
    }

    if (isTracked) {
      untrackShow.mutate(showId);
    } else {
      trackShow.mutate({
        show_id: showId,
        ...(tmdbId ? { tmdb_id: tmdbId } : {}),
        notify_new_episode: true,
        notify_new_season: true,
        notify_status_change: true,
      });
    }
  }

  if (!isAuthenticated) return null;

  if (variant === "icon") {
    return (
      <Button
        variant={isTracked ? "secondary" : "default"}
        size="icon"
        className={cn(
          "h-9 w-9 rounded-full transition-all",
          isTracked && "bg-primary/15 text-primary hover:bg-primary/25",
          !isTracked && "bg-primary text-primary-foreground glow-amber",
          className
        )}
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isTracked ? (
          <Check className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isTracked ? "secondary" : "default"}
      className={cn(
        "transition-all",
        isTracked
          ? "bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25"
          : "bg-primary text-primary-foreground glow-amber hover:glow-amber-strong",
        className
      )}
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isTracked ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      {isTracked ? "Tracking" : "Track"}
    </Button>
  );
}

import { AddIcon, CheckIcon } from "@/lib/icons";
import { Loader } from "@/components/motion/loader";
import { Button } from "@/components/ui/button";
import {
  useTrackShow,
  useUntrackShow,
  useTrackedShows,
} from "@/hooks/use-tracking";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface TrackingToggleProps {
  showId: string;
  tmdbId?: number | null;
  className?: string;
  /** "icon" for icon-only, "full" for a labelled button. */
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
    if (isTracked) {
      untrackShow.mutate(showId);
      return;
    }
    trackShow.mutate({
      show_id: showId,
      ...(tmdbId ? { tmdb_id: tmdbId } : {}),
      notify_new_episode: true,
      notify_new_season: true,
      notify_status_change: true,
    });
  }

  if (!isAuthenticated) return null;

  if (variant === "icon") {
    return (
      <Button
        variant={isTracked ? "secondary" : "default"}
        size="icon"
        aria-label={isTracked ? "Stop tracking" : "Track this show"}
        className={cn(
          "size-10 rounded-full press",
          isTracked
            ? "bg-primary/15 text-primary can-hover:hover:bg-primary/25"
            : "bg-primary text-primary-foreground glow-amber",
          className
        )}
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending ? (
          <Loader variant="spinner" size={16} />
        ) : isTracked ? (
          <CheckIcon className="size-4" />
        ) : (
          <AddIcon className="size-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isTracked ? "secondary" : "default"}
      aria-pressed={isTracked}
      className={cn(
        // Full-width on a phone so it's an unmissable primary action.
        "h-11 w-full rounded-xl font-semibold press sm:w-auto sm:min-w-36",
        isTracked
          ? "border border-primary/20 bg-primary/15 text-primary can-hover:hover:bg-primary/25"
          : "bg-primary text-primary-foreground glow-amber can-hover:hover:glow-amber-strong",
        className
      )}
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? (
        <Loader variant="spinner" size={16} className="mr-2" />
      ) : isTracked ? (
        <CheckIcon className="mr-2 size-4" />
      ) : (
        <AddIcon className="mr-2 size-4" />
      )}
      {isTracked ? "Tracking" : "Track"}
    </Button>
  );
}

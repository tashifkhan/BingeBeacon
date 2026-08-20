import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useTrackedShows,
  useFavorites,
  useToggleFavorite,
  useUntrackShow,
  useUpdateTracking,
} from "@/hooks/use-tracking";
import { ShowCard, ShowCardSkeleton } from "@/components/show-card";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  BellOffIcon,
  BellRingIcon,
  DeleteIcon,
  FavoriteIcon,
  SettingsIcon,
  StarIcon,
  TrackingIcon,
} from "@/lib/icons";
import { cn, posterUrl } from "@/lib/utils";
import type { TrackedShowResponse } from "@/types";
import { AppImage as Image } from "@/components/app-image";

export const Route = createFileRoute("/tracking")({ component: TrackingPage });

const GRID =
  "grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

function TrackingPage() {
  const { data: tracked, isLoading } = useTrackedShows();
  const { data: favorites, isLoading: favoritesLoading } = useFavorites();
  const [settingsShow, setSettingsShow] = useState<TrackedShowResponse | null>(
    null
  );

  return (
    <PageShell>
      <PageHeader
        title="Tracked Shows"
        icon={TrackingIcon}
        count={tracked?.length}
        description="Everything you're following, and what you'll be told about."
      />

      <Tabs defaultValue="all" className="animate-fade-in stagger-1">
        <TabsList className="w-full rounded-xl bg-muted/50 p-1 group-data-[orientation=horizontal]/tabs:h-12 sm:w-auto">
          <TabsTrigger value="all" className="h-full flex-1 gap-1.5 rounded-lg text-sm sm:flex-none sm:px-5">
            <TrackingIcon className="size-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="favorites" className="h-full flex-1 gap-1.5 rounded-lg text-sm sm:flex-none sm:px-5">
            <StarIcon className="size-4" />
            Favourites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <SkeletonGrid />
          ) : tracked && tracked.length > 0 ? (
            <div className={GRID}>
              {tracked.map((show, i) => (
                <TrackedShowCard
                  key={show.show_id}
                  show={show}
                  index={i}
                  onSettings={() => setSettingsShow(show)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={TrackingIcon}
              title="Nothing tracked yet"
              description="Find a show and start tracking it to get alerts about new episodes."
              actionLabel="Search shows"
              actionTo="/shows/search"
            />
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          {favoritesLoading ? (
            <SkeletonGrid />
          ) : favorites && favorites.length > 0 ? (
            <div className={GRID}>
              {favorites.map((show, i) => (
                <TrackedShowCard
                  key={show.show_id}
                  show={show}
                  index={i}
                  onSettings={() => setSettingsShow(show)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={StarIcon}
              title="No favourites yet"
              description="Tap the heart on any tracked show to pin it here."
            />
          )}
        </TabsContent>
      </Tabs>

      <TrackingSettingsSheet
        show={settingsShow}
        onClose={() => setSettingsShow(null)}
      />
    </PageShell>
  );
}

function SkeletonGrid() {
  return (
    <div className={GRID}>
      {Array.from({ length: 10 }).map((_, i) => (
        <ShowCardSkeleton key={i} />
      ))}
    </div>
  );
}

function TrackedShowCard({
  show,
  index,
  onSettings,
}: {
  show: TrackedShowResponse;
  index: number;
  onSettings: () => void;
}) {
  const toggleFav = useToggleFavorite();

  return (
    <ShowCard
      show={show}
      index={index}
      overlay={
        <div
          className={cn(
            "absolute right-1.5 top-1.5 flex flex-col gap-1.5",
            // Hover-reveal needs a cursor. On touch the controls are simply
            // always there — otherwise they can never be reached at all.
            "can-hover:opacity-0 can-hover:transition-opacity can-hover:group-hover:opacity-100",
            "can-hover:group-focus-within:opacity-100"
          )}
        >
          <CardAction
            label={show.is_favorite ? "Remove from favourites" : "Add to favourites"}
            onClick={() => toggleFav.mutate(show.show_id)}
            disabled={toggleFav.isPending}
          >
            <FavoriteIcon
              weight={show.is_favorite ? "Filled" : "Outline"}
              className={cn(
                "size-4",
                show.is_favorite ? "text-primary" : "text-white/80"
              )}
            />
          </CardAction>
          <CardAction label="Tracking settings" onClick={onSettings}>
            <SettingsIcon className="size-4 text-white/80" />
          </CardAction>
        </div>
      }
    />
  );
}

function CardAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full bg-black/65 backdrop-blur-sm press disabled:opacity-50 can-hover:hover:bg-black/85"
    >
      {children}
    </button>
  );
}

const NOTIFY_OPTIONS = [
  { key: "notify_new_episode", label: "New episodes", hint: "Every time an episode airs" },
  { key: "notify_new_season", label: "New seasons", hint: "When a new season is announced" },
  { key: "notify_status_change", label: "Status changes", hint: "Renewed, ended or cancelled" },
] as const;

function TrackingSettingsSheet({
  show,
  onClose,
}: {
  show: TrackedShowResponse | null;
  onClose: () => void;
}) {
  const updateTracking = useUpdateTracking();
  const untrackShow = useUntrackShow();

  if (!show) return null;

  return (
    <ResponsiveDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={show.show_title}
      description="Choose what BingeBeacon should tell you about."
      titleSlot={
        <span className="flex items-center gap-3">
          {show.poster_url && (
            <span className="relative block h-12 w-8 shrink-0 overflow-hidden rounded">
              <Image
                src={posterUrl(show.poster_url, "w185")}
                alt=""
                fill
                className="object-cover"
                sizes="32px"
              />
            </span>
          )}
          <span className="min-w-0 truncate">{show.show_title}</span>
        </span>
      }
    >
      <div className="space-y-5 pt-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Notifications
          </Label>

          {NOTIFY_OPTIONS.map(({ key, label, hint }) => {
            const enabled = show[key];
            return (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={updateTracking.isPending}
                className="flex w-full touch-target items-center justify-between gap-3 rounded-xl border border-border/60 px-3.5 py-3 text-left press can-hover:hover:bg-muted/50"
                onClick={() =>
                  updateTracking.mutate({
                    showId: show.show_id,
                    [key]: !enabled,
                  })
                }
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {hint}
                  </span>
                </span>
                {enabled ? (
                  <BellRingIcon
                    weight="Filled"
                    className="size-5 shrink-0 text-primary"
                  />
                ) : (
                  <BellOffIcon className="size-5 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>

        <Separator />

        <Button
          variant="destructive"
          className="h-11 w-full rounded-xl"
          disabled={untrackShow.isPending}
          onClick={() => {
            untrackShow.mutate(show.show_id);
            onClose();
          }}
        >
          <DeleteIcon className="mr-2 size-4" />
          Stop tracking
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

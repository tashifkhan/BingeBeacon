"use client";

import { useState } from "react";
import {
  useTrackedShows,
  useFavorites,
  useToggleFavorite,
  useUntrackShow,
  useUpdateTracking,
} from "@/hooks/use-tracking";
import { ShowCard, ShowCardSkeleton } from "@/components/show-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  Heart,
  HeartOff,
  Settings2,
  Star,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import { cn, posterUrl } from "@/lib/utils";
import type { TrackedShowResponse } from "@/types";
import Image from "next/image";

export default function TrackingPage() {
  const { data: tracked, isLoading } = useTrackedShows();
  const { data: favorites } = useFavorites();
  const [settingsShow, setSettingsShow] = useState<TrackedShowResponse | null>(
    null
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
          <Tv className="h-7 w-7 text-primary" />
          Tracked Shows
          {tracked && (
            <span className="text-lg font-normal text-muted-foreground">
              ({tracked.length})
            </span>
          )}
        </h1>
      </div>

      {/* Tabs: All / Favorites */}
      <Tabs defaultValue="all" className="animate-fade-in stagger-1">
        <TabsList className="w-auto bg-muted/50 rounded-xl h-10">
          <TabsTrigger value="all" className="rounded-lg text-sm gap-1.5">
            <Tv className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="favorites" className="rounded-lg text-sm gap-1.5">
            <Star className="h-4 w-4" />
            Favorites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <ShowCardSkeleton key={i} />
              ))}
            </div>
          ) : tracked && tracked.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
            <EmptyState />
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          {favorites && favorites.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Star className="mb-4 h-12 w-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                No favorites yet. Star a show to add it here.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Settings dialog */}
      {settingsShow && (
        <TrackingSettingsDialog
          show={settingsShow}
          onClose={() => setSettingsShow(null)}
        />
      )}
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
    <div className="group relative">
      <ShowCard show={show} index={index} />
      {/* Overlay controls on hover */}
      <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border-0"
          onClick={(e) => {
            e.preventDefault();
            toggleFav.mutate(show.show_id);
          }}
        >
          {show.is_favorite ? (
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
          ) : (
            <Heart className="h-3.5 w-3.5 text-white/70" />
          )}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border-0"
          onClick={(e) => {
            e.preventDefault();
            onSettings();
          }}
        >
          <Settings2 className="h-3.5 w-3.5 text-white/70" />
        </Button>
      </div>
    </div>
  );
}

function TrackingSettingsDialog({
  show,
  onClose,
}: {
  show: TrackedShowResponse;
  onClose: () => void;
}) {
  const updateTracking = useUpdateTracking();
  const untrackShow = useUntrackShow();

  const toggleSetting = (key: string, value: boolean) => {
    updateTracking.mutate({
      showId: show.show_id,
      [key]: !value,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-3">
            {show.poster_url && (
              <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded">
                <Image
                  src={posterUrl(show.poster_url, "w185")}
                  alt={show.show_title}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            )}
            {show.show_title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Notification Preferences
            </Label>

            {[
              {
                key: "notify_new_episode",
                label: "New episodes",
                value: show.notify_new_episode,
              },
              {
                key: "notify_new_season",
                label: "New seasons",
                value: show.notify_new_season,
              },
              {
                key: "notify_status_change",
                label: "Status changes",
                value: show.notify_status_change,
              },
            ].map(({ key, label, value }) => (
              <button
                key={key}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                onClick={() => toggleSetting(key, value)}
              >
                <span className="text-sm">{label}</span>
                {value ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>

          <Separator />

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              untrackShow.mutate(show.show_id);
              onClose();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Stop Tracking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Tv className="mb-4 h-12 w-12 text-muted-foreground/20" />
      <p className="text-sm text-muted-foreground">
        You&apos;re not tracking any shows yet.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-3">
        <a href="/shows/search">Search Shows</a>
      </Button>
    </div>
  );
}

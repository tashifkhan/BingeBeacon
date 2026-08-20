import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useHistory,
  useRemoveHistoryEntry,
  useUpdateHistoryEntry,
} from "@/hooks/useHistory";
import { AppImage as Image } from "@/components/app-image";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { PullToRefresh } from "@/components/motion/pull-to-refresh";
import { SwipeableList } from "@/components/motion/swipeable-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertIcon,
  DeleteIcon,
  EditIcon,
  HistoryIcon,
  ShowIcon,
  StarIcon,
} from "@/lib/icons";
import { cn, formatEpisodeCode, formatTimeAgo, posterUrl } from "@/lib/utils";
import type { WatchHistoryEntry } from "@/types";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const { data, isLoading, error } = useHistory();
  const queryClient = useQueryClient();
  const removeEntry = useRemoveHistoryEntry();
  const [editing, setEditing] = useState<WatchHistoryEntry | null>(null);

  function handleDelete(entry: WatchHistoryEntry) {
    removeEntry.mutate(entry.id, {
      onSuccess: () => toast.success("Removed from history"),
      onError: () => toast.error("Couldn't remove that entry"),
    });
  }

  return (
    <PullToRefresh
      onRefresh={async () => {
        await queryClient.invalidateQueries({ queryKey: ["history"] });
      }}
    >
      <PageShell width="narrow">
        <PageHeader
          title="Watch History"
          icon={HistoryIcon}
          count={data?.length}
          description="Everything you've marked as watched. Swipe a row for actions."
        />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <HistoryRowSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertIcon}
            title="Couldn't load your history"
            description="Check your connection and pull down to try again."
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="No history yet"
            description="Mark episodes as watched and they'll show up here."
            actionLabel="Browse shows"
            actionTo="/shows/search"
          />
        ) : (
          <SwipeableList
            className="animate-fade-in stagger-1"
            items={data.map((entry) => ({
              id: entry.id,
              content: <HistoryRow entry={entry} />,
              rightActions: [
                {
                  id: "edit",
                  label: "Edit",
                  icon: <EditIcon className="size-5" />,
                  tone: "neutral" as const,
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: <DeleteIcon className="size-5" />,
                  tone: "danger" as const,
                },
              ],
            }))}
            onAction={({ item, action }) => {
              const entry = data.find((e) => e.id === item.id);
              if (!entry) return;
              if (action.id === "edit") setEditing(entry);
              if (action.id === "delete") handleDelete(entry);
            }}
            classNames={{
              item: "rounded-xl border border-border/50 bg-card",
              surface: "bg-card",
            }}
          />
        )}

        {/* Keyed by entry so the form state resets when a different row is
            opened rather than carrying the previous row's rating over. */}
        <EditEntrySheet
          key={editing?.id ?? "none"}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      </PageShell>
    </PullToRefresh>
  );
}

function HistoryRow({ entry }: { entry: WatchHistoryEntry }) {
  const poster = entry.show?.poster_url;
  const code = formatEpisodeCode(entry.season_number, entry.episode_number);

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {poster ? (
          <Image
            src={posterUrl(poster, "w185")}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShowIcon className="size-4 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {entry.show_id ? (
          <Link
            to="/shows/$id"
            params={{ id: entry.show_id }}
            className="block truncate text-sm font-semibold leading-tight can-hover:hover:text-primary"
          >
            {entry.show?.title ?? "Unknown show"}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold leading-tight">
            {entry.show?.title ?? "Unknown show"}
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {code && (
            <span className="font-mono font-medium text-foreground/80">
              {code}
            </span>
          )}
          <span>{formatTimeAgo(entry.watched_at)}</span>
          {entry.rating != null && (
            <span className="flex items-center gap-0.5 font-medium text-primary">
              <StarIcon weight="Filled" className="size-3" />
              {entry.rating}/10
            </span>
          )}
        </div>

        {entry.notes && (
          <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground/80">
            {entry.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function HistoryRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
      <div className="aspect-[2/3] w-12 shrink-0 animate-pulse rounded-md bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function EditEntrySheet({
  entry,
  onClose,
}: {
  entry: WatchHistoryEntry | null;
  onClose: () => void;
}) {
  const update = useUpdateHistoryEntry();
  const [rating, setRating] = useState<number | null>(entry?.rating ?? null);
  const [notes, setNotes] = useState(entry?.notes ?? "");

  if (!entry) return null;

  return (
    <ResponsiveDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={entry.show?.title ?? "Edit entry"}
      description={
        formatEpisodeCode(entry.season_number, entry.episode_number) || undefined
      }
    >
      <form
        className="space-y-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate(
            {
              id: entry.id,
              data: {
                rating: rating ?? undefined,
                notes: notes.trim() || undefined,
              },
            },
            {
              onSuccess: () => {
                toast.success("Entry updated");
                onClose();
              },
              onError: () => toast.error("Couldn't save those changes"),
            }
          );
        }}
      >
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Rating
          </Label>
          {/* A 10-point tap scale beats a tiny drag slider on a phone. */}
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} out of 10`}
                aria-pressed={rating === n}
                onClick={() => setRating(rating === n ? null : n)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums press",
                  rating != null && n <= rating
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="history-notes" className="text-xs uppercase tracking-wider text-muted-foreground">
            Notes
          </Label>
          <Input
            id="history-notes"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            placeholder="What did you think?"
            className="h-11 rounded-xl border-border/60 bg-muted/50"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-11 flex-1 rounded-xl font-semibold"
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWatchlist, useRemoveFromWatchlist } from "@/hooks/useWatchlist";
import { AppImage as Image } from "@/components/app-image";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { ShowCardSkeleton } from "@/components/show-card";
import { PullToRefresh } from "@/components/motion/pull-to-refresh";
import { Badge } from "@/components/ui/badge";
import { AlertIcon, DeleteIcon, MovieIcon, WatchlistIcon } from "@/lib/icons";
import { cn, formatDate, posterUrl } from "@/lib/utils";
import type { WatchlistItem } from "@/types";

export const Route = createFileRoute("/watchlist")({ component: WatchlistPage });

const PRIORITY_STYLES: Record<WatchlistItem["priority"], string> = {
  high: "bg-primary/20 text-primary border-primary/30",
  medium: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  low: "bg-muted text-muted-foreground border-border",
};

function WatchlistPage() {
  const { data, isLoading, error, refetch } = useWatchlist();
  const queryClient = useQueryClient();

  return (
    <PullToRefresh
      onRefresh={async () => {
        await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      }}
    >
      <PageShell>
        <PageHeader
          title="Watchlist"
          icon={WatchlistIcon}
          count={data?.length}
          description="What you've lined up to watch next."
        />

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ShowCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertIcon}
            title="Couldn't load your watchlist"
            description="Check your connection and pull down to try again."
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={WatchlistIcon}
            title="Your watchlist is empty"
            description="Add shows you want to get to, and they'll queue up here."
            actionLabel="Browse shows"
            actionTo="/shows/search"
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {data.map((item, i) => (
              <WatchlistCard key={item.id} item={item} index={i} onRemoved={refetch} />
            ))}
          </ul>
        )}
      </PageShell>
    </PullToRefresh>
  );
}

function WatchlistCard({
  item,
  index,
  onRemoved,
}: {
  item: WatchlistItem;
  index: number;
  onRemoved: () => void;
}) {
  const remove = useRemoveFromWatchlist();
  const delay = Math.min(index, 6);
  const poster = item.show?.poster_url;

  return (
    <li className={cn("group relative animate-fade-in", `stagger-${delay}`)}>
      <Link
        to="/shows/$id"
        params={{ id: item.show_id }}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card press transition-colors can-hover:hover:border-primary/40"
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
              <MovieIcon className="size-8 text-muted-foreground/25" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent" />
          <Badge
            variant="outline"
            className={cn(
              "absolute left-2 top-2 px-1.5 py-0 text-[10px] font-semibold uppercase backdrop-blur-sm",
              PRIORITY_STYLES[item.priority]
            )}
          >
            {item.priority}
          </Badge>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight sm:text-sm">
            {item.show?.title ?? "Untitled"}
          </h3>
          {item.notes && (
            <p className="line-clamp-2 text-[11px] text-muted-foreground">
              {item.notes}
            </p>
          )}
          <p className="mt-auto text-[11px] text-muted-foreground/70">
            Added {formatDate(item.added_at)}
          </p>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Remove ${item.show?.title ?? "item"} from watchlist`}
        disabled={remove.isPending}
        onClick={() => {
          remove.mutate(item.show_id, {
            onSuccess: () => {
              toast.success("Removed from watchlist");
              onRemoved();
            },
            onError: () => toast.error("Couldn't remove that one"),
          });
        }}
        className={cn(
          "absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-full bg-black/65 backdrop-blur-sm press disabled:opacity-50",
          "can-hover:opacity-0 can-hover:transition-opacity can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100",
          "can-hover:hover:bg-black/85"
        )}
      >
        <DeleteIcon className="size-4 text-white/85" />
      </button>
    </li>
  );
}

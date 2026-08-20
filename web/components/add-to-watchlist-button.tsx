import {
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useUpdateWatchlistItem,
} from "@/hooks/useWatchlist";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/motion/loader";
import { CheckIcon, MoreIcon, WatchlistIcon } from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Priority = "low" | "medium" | "high";

interface AddToWatchlistButtonProps {
  showId: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
}

export function AddToWatchlistButton({
  showId,
  variant = "outline",
  className,
}: AddToWatchlistButtonProps) {
  const { data: watchlist, isLoading: isLoadingWatchlist } = useWatchlist(1, 100);
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const updateWatchlist = useUpdateWatchlistItem();

  const watchlistItem = watchlist?.find((item) => item.show_id === showId);
  const isMutating =
    addToWatchlist.isPending ||
    removeFromWatchlist.isPending ||
    updateWatchlist.isPending;

  const baseClass = "h-11 w-full rounded-xl press sm:w-auto sm:min-w-40";

  if (isLoadingWatchlist) {
    return (
      <Button variant={variant} disabled className={cn(baseClass, className)}>
        <Loader variant="spinner" size={16} className="mr-2" />
        Loading…
      </Button>
    );
  }

  function handleToggle() {
    if (watchlistItem) {
      removeFromWatchlist.mutate(watchlistItem.show_id);
    } else {
      addToWatchlist.mutate({ show_id: showId, priority: "medium" });
    }
  }

  if (watchlistItem) {
    return (
      <div className={cn("flex w-full items-center gap-2 sm:w-auto", className)}>
        <Button
          variant={variant}
          onClick={handleToggle}
          disabled={isMutating}
          className={cn(
            baseClass,
            "flex-1 bg-primary/10 text-primary can-hover:hover:bg-destructive/10 can-hover:hover:text-destructive"
          )}
        >
          {isMutating ? (
            <Loader variant="spinner" size={16} className="mr-2" />
          ) : (
            <CheckIcon className="mr-2 size-4" />
          )}
          In watchlist
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
            >
              <MoreIcon className="size-4" />
              <span className="sr-only">Watchlist options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={watchlistItem.priority}
              onValueChange={(value) => {
                if (value === "low" || value === "medium" || value === "high") {
                  updateWatchlist.mutate({
                    id: watchlistItem.show_id,
                    data: { priority: value as Priority },
                  });
                }
              }}
            >
              <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleToggle}
            >
              Remove from watchlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      onClick={handleToggle}
      disabled={isMutating}
      className={cn(baseClass, className)}
    >
      {isMutating ? (
        <Loader variant="spinner" size={16} className="mr-2" />
      ) : (
        <WatchlistIcon className="mr-2 size-4" />
      )}
      Add to watchlist
    </Button>
  );
}

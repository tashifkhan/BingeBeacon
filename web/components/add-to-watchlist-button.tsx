"use client";

import { useState } from "react";
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist, useUpdateWatchlistItem } from "@/hooks/useWatchlist";
import { Button } from "@/components/ui/button";
import { Bookmark, Check, Loader2, MoreHorizontal } from "lucide-react";
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

interface AddToWatchlistButtonProps {
  showId: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AddToWatchlistButton({ showId, variant = "outline", size = "default", className }: AddToWatchlistButtonProps) {
  const { data: watchlist, isLoading: isLoadingWatchlist } = useWatchlist(1, 100); // Fetch enough to likely find it
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const updateWatchlist = useUpdateWatchlistItem();

  const watchlistItem = watchlist?.data.find((item) => item.show_id === showId);
  const isInWatchlist = !!watchlistItem;
  const isLoading = isLoadingWatchlist || addToWatchlist.isPending || removeFromWatchlist.isPending || updateWatchlist.isPending;

  const handleToggle = () => {
    if (isInWatchlist) {
      removeFromWatchlist.mutate(watchlistItem.id);
    } else {
      addToWatchlist.mutate({ show_id: showId, priority: "medium" });
    }
  };

  const handlePriorityChange = (priority: "low" | "medium" | "high") => {
    if (watchlistItem) {
      updateWatchlist.mutate({ id: watchlistItem.id, data: { priority } });
    }
  };

  if (isLoadingWatchlist) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isInWatchlist) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant={variant}
          size={size}
          onClick={handleToggle}
          className={cn("bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive", className)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          In Watchlist
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={watchlistItem.priority} onValueChange={(v) => handlePriorityChange(v as any)}>
              <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={handleToggle}
            >
              Remove from Watchlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className="mr-2 h-4 w-4" />
      )}
      Add to Watchlist
    </Button>
  );
}

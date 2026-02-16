"use client";

import { useWatchlist } from "@/hooks/useWatchlist";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function WatchlistPage() {
  const { data, isLoading, error } = useWatchlist();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-destructive">
        Error loading watchlist
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Your Watchlist</h1>

      {data?.data.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Your watchlist is empty
          </p>
          <p className="text-sm text-muted-foreground">
            Start adding shows to keep track of what to watch next.
          </p>
          <Link
            href="/search"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Browse Shows
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.data.map((item) => (
            <Link
              key={item.id}
              href={`/shows/${item.show_id}`}
              className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground transition-all hover:shadow-lg"
            >
              <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
                {item.show?.poster_url ? (
                  <Image
                    src={item.show.poster_url}
                    alt={item.show.title}
                    width={300}
                    height={450}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No Poster
                  </div>
                )}
                <div className="absolute top-2 right-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {item.priority.toUpperCase()}
                </div>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-1 font-semibold">{item.show?.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {item.notes || "No notes"}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Added {new Date(item.added_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useHistory } from "@/hooks/useHistory";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HistoryPage() {
  const { data, isLoading, error } = useHistory();

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
        Error loading history
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Watch History</h1>

      {data?.data.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No history found
          </p>
          <p className="text-sm text-muted-foreground">
            Start watching shows to track your progress.
          </p>
          <Link
            href="/search"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Browse Shows
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="relative aspect-[2/3] w-16 overflow-hidden rounded bg-muted">
                  {entry.show_poster_url ? (
                    <Image
                      src={entry.show_poster_url}
                      alt={entry.show_title || "Show Poster"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No Poster
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{entry.show_title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Season {entry.season_number}, Episode {entry.episode_number}
                    </span>
                    <span>•</span>
                    <span>{new Date(entry.watched_at).toLocaleDateString()}</span>
                  </div>
                  {entry.rating && (
                    <div className="mt-1 flex items-center gap-1 text-sm font-medium text-amber-500">
                      ★ {entry.rating}/10
                    </div>
                  )}
                  {entry.notes && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      "{entry.notes}"
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
                  aria-label="Edit entry"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
                <button
                  className="rounded-full bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
                  aria-label="Delete entry"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

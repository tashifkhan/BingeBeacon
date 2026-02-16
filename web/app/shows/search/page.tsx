"use client";

import { useState } from "react";
import { useShowSearch } from "@/hooks/use-shows";
import { SearchBar } from "@/components/search-bar";
import { ShowCard, ShowCardSkeleton } from "@/components/show-card";
import { Search } from "lucide-react";
import type { Metadata } from "next";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading, isFetching } = useShowSearch(query);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Search
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find TV shows and movies to track
        </p>
      </div>

      {/* Search */}
      <div className="mb-8 animate-fade-in stagger-1">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search for a show or movie..."
          autoFocus
        />
      </div>

      {/* Results */}
      {isLoading || isFetching ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ShowCardSkeleton key={i} />
          ))}
        </div>
      ) : results && results.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((show, i) => (
            <ShowCard key={show.id} show={show} index={i} />
          ))}
        </div>
      ) : query.length >= 2 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            Type at least 2 characters to search
          </p>
        </div>
      )}
    </div>
  );
}

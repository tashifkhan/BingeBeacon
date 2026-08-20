import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useShowSearch, useTrendingShows } from "@/hooks/use-shows";
import { SearchBar } from "@/components/search-bar";
import { ShowCard, ShowCardSkeleton } from "@/components/show-card";
import { PageShell, PageHeader, EmptyState, SectionHeader } from "@/components/page-shell";
import { SearchIcon, TrendingIcon } from "@/lib/icons";

export const Route = createFileRoute("/shows/search")({ component: SearchPage });

const GRID =
  "grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading, isFetching } = useShowSearch(query);
  const { data: trending, isLoading: trendingLoading } = useTrendingShows();

  const hasQuery = query.trim().length >= 2;
  const searching = hasQuery && (isLoading || isFetching);

  return (
    <PageShell>
      <PageHeader
        title="Search"
        description="Find TV shows and movies to track."
      />

      {/* Sticky so the field stays reachable while thumbing through results. */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 bg-background/85 px-4 py-2 backdrop-blur-lg sm:-mx-6 sm:px-6 animate-fade-in stagger-1">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search for a show or movie..."
          autoFocus
        />
      </div>

      {searching ? (
        <div className={GRID}>
          {Array.from({ length: 10 }).map((_, i) => (
            <ShowCardSkeleton key={i} />
          ))}
        </div>
      ) : hasQuery && results && results.length > 0 ? (
        <div className={GRID}>
          {results.map((show, i) => (
            <ShowCard
              key={show.id ?? `${show.media_type}-${show.tmdb_id}`}
              show={show}
              index={i}
            />
          ))}
        </div>
      ) : hasQuery ? (
        <EmptyState
          icon={SearchIcon}
          title={`No results for “${query.trim()}”`}
          description="Try a different spelling, or search the original title."
        />
      ) : trendingLoading ? (
        <div className={GRID}>
          {Array.from({ length: 10 }).map((_, i) => (
            <ShowCardSkeleton key={i} />
          ))}
        </div>
      ) : trending && trending.length > 0 ? (
        <section>
          <SectionHeader title="Trending on the radar" icon={TrendingIcon} />
          <div className={GRID}>
            {trending.slice(0, 10).map((show, i) => (
              <ShowCard
                key={`${show.media_type}-${show.tmdb_id}`}
                show={show}
                index={i}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={SearchIcon}
          title="Start typing"
          description="Enter at least two characters to search the catalog."
        />
      )}
    </PageShell>
  );
}

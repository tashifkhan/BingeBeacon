import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type { Show, ShowSearchResult, Season, Episode } from "@/types";

export function useShowSearch(query: string) {
  return useQuery({
    queryKey: ["show-search", query],
    queryFn: () =>
      unwrap<ShowSearchResult[]>(api.get("/shows/search", { params: { q: query } })),
    enabled: query.length >= 2,
    staleTime: 60 * 60 * 1000, // 1 hour — search results are stable
    placeholderData: (prev) => prev,
  });
}

export function useTrendingShows(mediaType: "all" | "tv" | "movie" = "all") {
	return useQuery({
		queryKey: ["shows-trending", mediaType],
		queryFn: () => unwrap<ShowSearchResult[]>(api.get("/shows/trending", {
			params: { type: mediaType, window: "day" },
		})),
		staleTime: 60 * 60 * 1000,
	});
}

export function usePopularShows(mediaType: "tv" | "movie" = "tv", page = 1) {
	return useQuery({
		queryKey: ["shows-popular", mediaType, page],
		queryFn: () => unwrap<ShowSearchResult[]>(api.get("/shows/popular", {
			params: { type: mediaType, page },
		})),
		staleTime: 60 * 60 * 1000,
	});
}

export function useImportShow(mediaType: string, tmdbId: number) {
	return useQuery({
		queryKey: ["show-import", mediaType, tmdbId],
		queryFn: () => unwrap<Show>(api.post("/shows/import", {
			tmdb_id: tmdbId,
			media_type: mediaType,
		})),
		enabled: (mediaType === "tv" || mediaType === "movie") && tmdbId > 0,
		staleTime: Number.POSITIVE_INFINITY,
		retry: 1,
	});
}

export function useShowDetail(id: string) {
  return useQuery({
    queryKey: ["show-detail", id],
    queryFn: () => unwrap<Show>(api.get(`/shows/${id}`)),
    staleTime: 15 * 60 * 1000, // 15 min
    enabled: !!id,
  });
}

export function useSeasonDetail(showId: string, seasonNumber: number) {
  return useQuery({
    queryKey: ["season-detail", showId, seasonNumber],
    queryFn: () =>
      unwrap<Season>(api.get(`/shows/${showId}/seasons/${seasonNumber}`)),
    staleTime: 15 * 60 * 1000,
    enabled: !!showId && seasonNumber > 0,
  });
}

export function useUpcomingEpisodes(showId: string) {
  return useQuery({
    queryKey: ["upcoming-episodes", showId],
    queryFn: () =>
      unwrap<Episode[]>(
        api.get(`/shows/${showId}/episodes`, { params: { upcoming: true } })
      ),
    staleTime: 10 * 60 * 1000,
    enabled: !!showId,
  });
}

export function useSyncStatus(showId: string) {
  return useQuery({
    queryKey: ["sync-status", showId],
    queryFn: () => unwrap<{ last_synced_at: string; seasons_count: number; episodes_count: number }>(
      api.get(`/shows/${showId}/sync-status`)
    ),
    staleTime: 30 * 60 * 1000,
    enabled: !!showId,
  });
}

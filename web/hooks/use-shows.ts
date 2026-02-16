import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type { Show, Season, Episode } from "@/types";

export function useShowSearch(query: string) {
  return useQuery({
    queryKey: ["show-search", query],
    queryFn: () =>
      unwrap<Show[]>(api.get("/shows/search", { params: { q: query } })),
    enabled: query.length >= 2,
    staleTime: 60 * 60 * 1000, // 1 hour — search results are stable
    placeholderData: (prev) => prev,
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { 
  WatchlistItem, 
  CreateWatchlistItemRequest, 
  UpdateWatchlistItemRequest,
} from "@/types";

export function useWatchlist(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ["watchlist", page, perPage],
    queryFn: async () => {
		return unwrap<WatchlistItem[]>(api.get("/watchlist", {
			params: { page, per_page: perPage },
		}));
    },
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWatchlistItemRequest) => {
		return unwrap<{ message: string }>(api.post("/watchlist", data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
	mutationFn: async (showId: string) => {
	  await api.delete(`/watchlist/${showId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useUpdateWatchlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
	mutationFn: async ({ id: showId, data }: { id: string; data: UpdateWatchlistItemRequest }) => {
	  return unwrap<{ message: string }>(api.patch(`/watchlist/${showId}`, data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

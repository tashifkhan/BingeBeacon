import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  WatchlistItem, 
  CreateWatchlistItemRequest, 
  UpdateWatchlistItemRequest,
  PaginatedResponse 
} from "@/types";

export function useWatchlist(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ["watchlist", page, perPage],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<WatchlistItem>>("/api/v1/watchlist", {
        params: { page, per_page: perPage },
      });
      return data;
    },
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateWatchlistItemRequest) => {
      const res = await api.post<WatchlistItem>("/api/v1/watchlist", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useUpdateWatchlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWatchlistItemRequest }) => {
      const res = await api.patch<WatchlistItem>(`/api/v1/watchlist/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

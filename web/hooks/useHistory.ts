import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  WatchHistoryEntry, 
  CreateHistoryEntryRequest, 
  UpdateHistoryEntryRequest,
  PaginatedResponse 
} from "@/types";

export function useHistory(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ["history", page, perPage],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<WatchHistoryEntry>>("/api/v1/history", {
        params: { page, per_page: perPage },
      });
      return data;
    },
  });
}

export function useHistoryStats() {
  return useQuery({
    queryKey: ["history", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/history/stats");
      return data;
    },
  });
}

export function useShowProgress(showId: string) {
  return useQuery({
    queryKey: ["history", "progress", showId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/history/progress/${showId}`);
      return data;
    },
  });
}

export function useMarkWatched() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateHistoryEntryRequest) => {
      const res = await api.post<WatchHistoryEntry>("/api/v1/history", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useUpdateHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateHistoryEntryRequest }) => {
      const res = await api.patch<WatchHistoryEntry>(`/api/v1/history/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useRemoveHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { 
  WatchHistoryEntry, 
  CreateHistoryEntryRequest, 
  UpdateHistoryEntryRequest,
	HistoryStats,
	ShowProgress,
} from "@/types";

export function useHistory(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ["history", page, perPage],
    queryFn: async () => {
		return unwrap<WatchHistoryEntry[]>(api.get("/history", {
			params: { page, per_page: perPage, limit: perPage },
		}));
    },
  });
}

export function useHistoryStats() {
  return useQuery({
    queryKey: ["history", "stats"],
    queryFn: async () => {
		return unwrap<HistoryStats>(api.get("/history/stats"));
    },
  });
}

export function useShowProgress(showId: string) {
  return useQuery({
    queryKey: ["history", "progress", showId],
    queryFn: async () => {
		return unwrap<ShowProgress>(api.get(`/history/${showId}/progress`));
    },
  });
}

export function useMarkWatched() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateHistoryEntryRequest) => {
		return unwrap<{ message: string }>(api.post("/history", data));
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
		return unwrap<{ message: string }>(api.patch(`/history/${id}`, data));
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
	  await api.delete(`/history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

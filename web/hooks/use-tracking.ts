import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type {
  TrackedShowResponse,
  TrackShowRequest,
  UpdateTrackingRequest,
} from "@/types";

export function useTrackedShows() {
  return useQuery({
    queryKey: ["tracking"],
    queryFn: () =>
      unwrap<TrackedShowResponse[]>(api.get("/tracking")),
    staleTime: 10 * 60 * 1000, // 10 min — doesn't change often
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ["tracking", "favorites"],
    queryFn: () =>
      unwrap<TrackedShowResponse[]>(api.get("/tracking/favorites")),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrackShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TrackShowRequest) =>
      api.post("/tracking", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracking"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useUntrackShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (showId: string) => api.delete(`/tracking/${showId}`),
    // Optimistic update: remove from cache immediately
    onMutate: async (showId) => {
      await qc.cancelQueries({ queryKey: ["tracking"] });
      const previous = qc.getQueryData<TrackedShowResponse[]>(["tracking"]);
      qc.setQueryData<TrackedShowResponse[]>(
        ["tracking"],
        (old) => old?.filter((s) => s.show_id !== showId) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["tracking"], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tracking"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (showId: string) =>
      api.post(`/tracking/${showId}/favorite`),
    onMutate: async (showId) => {
      await qc.cancelQueries({ queryKey: ["tracking"] });
      const previous = qc.getQueryData<TrackedShowResponse[]>(["tracking"]);
      qc.setQueryData<TrackedShowResponse[]>(
        ["tracking"],
        (old) =>
          old?.map((s) =>
            s.show_id === showId
              ? { ...s, is_favorite: !s.is_favorite }
              : s
          ) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["tracking"], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tracking"] });
    },
  });
}

export function useUpdateTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      showId,
      ...data
    }: UpdateTrackingRequest & { showId: string }) =>
      api.patch(`/tracking/${showId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracking"] });
    },
  });
}

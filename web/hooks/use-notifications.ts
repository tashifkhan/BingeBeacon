import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type {
  PaginatedNotifications,
  NotificationFilters,
  UnreadCount,
} from "@/types";

export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: ["notifications", filters],
    queryFn: async () => {
      // Backend returns double-nested: { data: { data: [...], total, page, limit } }
      const result = await unwrap<PaginatedNotifications>(
        api.get("/notifications", { params: filters })
      );
      return result;
    },
    staleTime: 60 * 1000, // 1 min
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications-count"],
    queryFn: () =>
      unwrap<UnreadCount>(api.get("/notifications/unread-count")),
    staleTime: 30 * 1000, // 30 sec
    refetchInterval: 60 * 1000, // Poll every minute
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onMutate: async () => {
      // Optimistically set unread count to 0
      await qc.cancelQueries({ queryKey: ["notifications-count"] });
      const previous = qc.getQueryData<UnreadCount>(["notifications-count"]);
      qc.setQueryData<UnreadCount>(["notifications-count"], { count: 0 });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["notifications-count"], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });
}

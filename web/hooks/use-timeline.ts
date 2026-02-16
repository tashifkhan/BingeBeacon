import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type { TimelineEvent } from "@/types";

export function useTimeline(range: "today" | "week" | "upcoming") {
  return useQuery({
    queryKey: ["timeline", range],
    queryFn: () =>
      unwrap<TimelineEvent[]>(api.get(`/timeline/${range}`)),
    staleTime: 2 * 60 * 1000, // 2 min — timeline changes often
  });
}

export function useTimelineRange(from: string, to: string) {
  return useQuery({
    queryKey: ["timeline", "range", from, to],
    queryFn: () =>
      unwrap<TimelineEvent[]>(
        api.get("/timeline", { params: { from, to } })
      ),
    staleTime: 5 * 60 * 1000,
    enabled: !!from && !!to,
  });
}

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { StreamingOptions } from "@/types";

export function useStreaming(id: string, region = "IN") {
  return useQuery({
    queryKey: ["streaming", id, region],
    queryFn: async () => {
		return unwrap<StreamingOptions>(api.get(`/streaming/${id}`, {
			params: { region },
		}));
    },
    enabled: !!id,
  });
}

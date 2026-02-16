import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StreamingOptions } from "@/types";

export function useStreaming(id: string, region = "IN") {
  return useQuery({
    queryKey: ["streaming", id, region],
    queryFn: async () => {
      const { data } = await api.get<StreamingOptions>(`/api/v1/streaming/${id}`, {
        params: { region },
      });
      return data;
    },
    enabled: !!id,
  });
}

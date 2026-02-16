import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ShowtimesResponse, CinemasNearbyResponse } from "@/types";

export function useShowtimes(id: string, lat?: number, lng?: number, date?: string) {
  return useQuery({
    queryKey: ["showtimes", id, lat, lng, date],
    queryFn: async () => {
      // API expects "lat;lng" format for geolocation
      const geolocation = lat && lng ? `${lat};${lng}` : undefined;
      const { data } = await api.get<ShowtimesResponse>(`/api/v1/showtimes/${id}`, {
        params: { geolocation, date },
      });
      return data;
    },
    enabled: !!id && !!lat && !!lng && !!date,
  });
}

export function useCinemasNearby(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ["cinemas", lat, lng],
    queryFn: async () => {
      const geolocation = lat && lng ? `${lat};${lng}` : undefined;
      const { data } = await api.get<CinemasNearbyResponse>("/api/v1/cinemas/nearby", {
        params: { geolocation },
      });
      return data;
    },
    enabled: !!lat && !!lng,
  });
}

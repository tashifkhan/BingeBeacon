import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { ShowtimesResponse, CinemasNearbyResponse } from "@/types";

export function useShowtimes(id: string, lat?: number, lng?: number, date?: string) {
  return useQuery({
    queryKey: ["showtimes", id, lat, lng, date],
    queryFn: async () => {
      // API expects "lat;lng" format for geolocation
      const geolocation = lat && lng ? `${lat};${lng}` : undefined;
		return unwrap<ShowtimesResponse>(api.get(`/showtimes/${id}`, {
			params: { geolocation, date },
		}));
    },
    enabled: !!id && !!lat && !!lng && !!date,
  });
}

export function useCinemasNearby(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ["cinemas", lat, lng],
    queryFn: async () => {
      const geolocation = lat && lng ? `${lat};${lng}` : undefined;
		return unwrap<CinemasNearbyResponse>(api.get("/showtimes/cinemas/nearby", {
			params: { geolocation },
		}));
    },
    enabled: !!lat && !!lng,
  });
}

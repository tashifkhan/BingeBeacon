"use client";

import { useState } from "react";
import { useShowtimes } from "@/hooks/useShowtimes";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ShowtimesProps {
  showId: string;
  mediaType: string;
}

export function Showtimes({ showId, mediaType }: ShowtimesProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Default to today
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: showtimes, isLoading: isLoadingShowtimes, error } = useShowtimes(
    showId,
    location?.lat,
    location?.lng,
    today
  );

  const requestLocation = () => {
    setIsLoadingLocation(true);
    if (!navigator.geolocation) {
      setPermissionDenied(true);
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoadingLocation(false);
      },
      () => {
        setPermissionDenied(true);
        setIsLoadingLocation(false);
      }
    );
  };

  if (mediaType !== "movie") {
    return null;
  }

  // Helper to extract cinemas from the nested structure
  const cinemas = showtimes?.films.flatMap(f => f.showtimes) || [];

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        Showtimes Nearby
      </h3>

      {!location ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            See showtimes for cinemas near you.
          </p>
          {permissionDenied ? (
            <p className="text-sm text-destructive">
              Location access denied. Please enable location services to see showtimes.
            </p>
          ) : (
            <Button onClick={requestLocation} disabled={isLoadingLocation}>
              {isLoadingLocation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              Use My Location
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {isLoadingShowtimes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
             <div className="text-center text-sm text-destructive py-4">
              Unable to load showtimes.
            </div>
          ) : cinemas.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No showtimes found nearby for today.
            </div>
          ) : (
            <div className="space-y-4">
              {cinemas.map((cinema, idx) => (
                <div key={`${cinema.cinema_id}-${idx}`} className="rounded-md border p-3">
                  <h4 className="font-medium mb-2">{cinema.cinema_name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {cinema.times.map((time, tIdx) => (
                      <Badge key={tIdx} variant="outline">
                        {time}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

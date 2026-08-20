import { useState } from "react";
import { format } from "date-fns";
import { useShowtimes } from "@/hooks/useShowtimes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/motion/loader";
import { LocationIcon, ShowtimeIcon } from "@/lib/icons";

interface ShowtimesProps {
  showId: string;
  mediaType: string;
}

export function Showtimes({ showId, mediaType }: ShowtimesProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const {
    data: showtimes,
    isLoading: isLoadingShowtimes,
    error,
  } = useShowtimes(showId, location?.lat, location?.lng, today);

  function requestLocation() {
    if (!navigator.geolocation) {
      setPermissionDenied(true);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setPermissionDenied(true);
        setIsLocating(false);
      }
    );
  }

  if (mediaType !== "movie") return null;

  const cinemas = showtimes?.films.flatMap((f) => f.showtimes) ?? [];

  return (
    <section className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <ShowtimeIcon weight="Filled" className="size-4 text-primary" />
        Showtimes nearby
      </h3>

      {!location ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            See screenings at cinemas near you.
          </p>
          {permissionDenied ? (
            <p className="text-sm text-destructive">
              Location access was denied. Enable location services to see
              showtimes.
            </p>
          ) : (
            <Button
              onClick={requestLocation}
              disabled={isLocating}
              className="h-11 w-full rounded-xl press"
            >
              {isLocating ? (
                <Loader variant="spinner" size={16} className="mr-2" />
              ) : (
                <LocationIcon className="mr-2 size-4" />
              )}
              Use my location
            </Button>
          )}
        </div>
      ) : isLoadingShowtimes ? (
        <div className="flex justify-center py-6">
          <Loader variant="dots" size={20} label="Finding showtimes" />
        </div>
      ) : error ? (
        <p className="py-3 text-center text-sm text-destructive">
          Unable to load showtimes.
        </p>
      ) : cinemas.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          No showtimes found nearby for today.
        </p>
      ) : (
        <ul className="space-y-3">
          {cinemas.map((cinema, idx) => (
            <li
              key={`${cinema.cinema_id}-${idx}`}
              className="rounded-lg border border-border/50 p-3"
            >
              <h4 className="mb-2 text-sm font-medium">{cinema.cinema_name}</h4>
              <div className="flex flex-wrap gap-1.5">
                {cinema.times.map((time, tIdx) => (
                  <Badge
                    key={tIdx}
                    variant="outline"
                    className="tabular-nums"
                  >
                    {time}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

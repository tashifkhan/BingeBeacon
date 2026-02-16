"use client";

import { useStreaming } from "@/hooks/useStreaming";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface StreamingProvidersProps {
  showId: string;
  region?: string; // Default 'IN'
}

export function StreamingProviders({ showId, region = "IN" }: StreamingProvidersProps) {
  const { data: streaming, isLoading } = useStreaming(showId, region);

  if (isLoading) {
    return (
      <div className="flex h-20 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!streaming || (!streaming.flatrate && !streaming.rent && !streaming.buy)) {
    return null; // Don't show anything if no providers
  }

  const hasFlatrate = streaming.flatrate && streaming.flatrate.length > 0;
  const hasRent = streaming.rent && streaming.rent.length > 0;
  const hasBuy = streaming.buy && streaming.buy.length > 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-lg font-semibold">Where to Watch</h3>
      
      <div className="space-y-6">
        {hasFlatrate && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Stream</h4>
            <div className="flex flex-wrap gap-4">
              {streaming.flatrate?.map((provider) => (
                <div key={provider.provider_id} className="flex flex-col items-center gap-2">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-white shadow-sm">
                    <Image
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt={provider.provider_name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <span className="text-xs text-center w-16 line-clamp-2">{provider.provider_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasRent && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Rent</h4>
            <div className="flex flex-wrap gap-4">
              {streaming.rent?.map((provider) => (
                <div key={provider.provider_id} className="flex flex-col items-center gap-2">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-white shadow-sm">
                    <Image
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt={provider.provider_name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                   <span className="text-xs text-center w-16 line-clamp-2">{provider.provider_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBuy && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Buy</h4>
            <div className="flex flex-wrap gap-4">
              {streaming.buy?.map((provider) => (
                <div key={provider.provider_id} className="flex flex-col items-center gap-2">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-white shadow-sm">
                    <Image
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt={provider.provider_name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                   <span className="text-xs text-center w-16 line-clamp-2">{provider.provider_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {streaming.link && (
          <div className="pt-2">
             <Link
              href={streaming.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View all options on TMDB
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

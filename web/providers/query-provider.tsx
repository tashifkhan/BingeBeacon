"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

function makeQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 5 minutes — no refetch
        staleTime: 5 * 60 * 1000,
        // Keep unused cache for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Retry failed requests 2 times
        retry: 2,
        // Refetch when window regains focus
        refetchOnWindowFocus: true,
        // Always refetch on reconnect
        refetchOnReconnect: "always",
      },
    },
  });

  // Only persist on the client side
  if (typeof window !== "undefined") {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      throttleTime: 1000,
      key: "bb-query-cache",
    });

    persistQueryClient({
      queryClient: client,
      persister,
      // Cache persists for 24 hours across browser restarts
      maxAge: 24 * 60 * 60 * 1000,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only persist these query keys to localStorage for offline PWA
          const persistKeys = [
            "timeline",
            "tracking",
            "show-detail",
            "notifications-count",
          ];
          const key = query.queryKey[0];
          return (
            typeof key === "string" &&
            persistKeys.some((pk) => key.startsWith(pk))
          );
        },
      },
    });
  }

  return client;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}

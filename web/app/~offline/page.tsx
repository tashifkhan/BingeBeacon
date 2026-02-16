"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="animate-fade-in">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">
          You&apos;re Offline
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
          It looks like you&apos;ve lost your internet connection. Your cached
          data is still available, and we&apos;ll reconnect as soon as
          you&apos;re back online.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all glow-amber hover:glow-amber-strong"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

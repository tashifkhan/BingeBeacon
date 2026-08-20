import { createFileRoute } from "@tanstack/react-router";
import { OfflineIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/~offline")({ component: OfflinePage });

function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <OfflineIcon className="size-8 text-muted-foreground" />
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Looks like the connection dropped. Anything already cached is still
          available, and we&apos;ll reconnect as soon as you&apos;re back.
        </p>

        <Button
          onClick={() => window.location.reload()}
          className="mt-6 h-12 rounded-xl px-6 font-semibold glow-amber press can-hover:hover:glow-amber-strong"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}

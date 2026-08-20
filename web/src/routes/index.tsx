import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { useTimeline } from "@/hooks/use-timeline";
import { useTrackedShows, useFavorites } from "@/hooks/use-tracking";
import { ShowCard, ShowCardSkeleton } from "@/components/show-card";
import {
  TimelineEventCard,
  TimelineEventSkeleton,
} from "@/components/timeline-event";
import { PageShell, SectionHeader, EmptyState } from "@/components/page-shell";
import { PullToRefresh } from "@/components/motion/pull-to-refresh";
import { TextShimmer } from "@/components/motion/text-shimmer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StarIcon,
  TimelineIcon,
  TrackingIcon,
  ZapIcon,
} from "@/lib/icons";
import type { TrackedShowResponse } from "@/types";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  if (authLoading) return <DashboardSkeleton />;
  if (!isAuthenticated) return <LandingHero />;
  return <AuthenticatedDashboard username={user?.username ?? ""} />;
}

// ---------- Unauthenticated landing ----------
function LandingHero() {
  return (
    <div className="flex min-h-[85dvh] flex-col items-center justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-lg text-center animate-fade-in">
        <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-2xl bg-primary/10 glow-amber-strong">
          <span className="size-6 animate-beacon-pulse rounded-full bg-primary" />
        </div>

        <h1 className="font-display text-[2rem] font-extrabold leading-tight tracking-tight sm:text-5xl">
          Binge<span className="text-primary">Beacon</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          Never miss an episode again. Track your shows, get told about new
          seasons, and stay ahead of every premiere.
        </p>

        {/* Primary action sits first and full-width — thumb reach matters more
            than symmetry on a phone. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-xl font-semibold glow-amber can-hover:hover:glow-amber-strong sm:px-8"
          >
            <Link to="/register">Get started</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-xl border-border/60 sm:px-8"
          >
            <Link to="/login">Sign in</Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4">
          {[
            { icon: TrackingIcon, label: "Track shows" },
            { icon: TimelineIcon, label: "Timeline view" },
            { icon: ZapIcon, label: "Instant alerts" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                <Icon weight="Filled" className="size-5 text-primary/80" />
              </div>
              <span className="text-xs leading-tight text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Authenticated dashboard ----------
function AuthenticatedDashboard({ username }: { username: string }) {
  const { data: todayEvents, isLoading: eventsLoading } = useTimeline("today");
  const { data: tracked, isLoading: trackedLoading } = useTrackedShows();
  const { data: favorites } = useFavorites();
  const queryClient = useQueryClient();

  return (
    <PullToRefresh
      onRefresh={async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["timeline"] }),
          queryClient.invalidateQueries({ queryKey: ["tracked-shows"] }),
        ]);
      }}
    >
      <PageShell className="space-y-8">
        <header className="animate-fade-in pr-32 md:pr-0">
          <p className="text-sm text-muted-foreground">{getGreeting()}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            {username ? `Hey, ${username}` : "Dashboard"}
          </h1>
        </header>

        <section className="animate-fade-in stagger-1">
          <SectionHeader
            title="Today"
            icon={TimelineIcon}
            actionLabel="View all"
            actionTo="/timeline"
          />

          {eventsLoading ? (
            <div className="space-y-2.5">
              <TimelineEventSkeleton />
              <TimelineEventSkeleton />
            </div>
          ) : todayEvents && todayEvents.length > 0 ? (
            <div className="space-y-2.5">
              {todayEvents.slice(0, 5).map((event, i) => (
                <TimelineEventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing on your radar today. Enjoy the calm.
              </p>
            </div>
          )}
        </section>

        {favorites && favorites.length > 0 && (
          <section className="animate-fade-in stagger-2">
            <SectionHeader
              title="Favourites"
              icon={StarIcon}
              actionLabel="Manage"
              actionTo="/tracking"
            />
            <PosterRail shows={favorites.slice(0, 10)} />
          </section>
        )}

        <section className="animate-fade-in stagger-3">
          <SectionHeader
            title="Tracked Shows"
            icon={TrackingIcon}
            count={tracked?.length}
            actionLabel="View all"
            actionTo="/tracking"
          />

          {trackedLoading ? (
            <RailSkeleton />
          ) : tracked && tracked.length > 0 ? (
            <PosterRail shows={tracked.slice(0, 12)} />
          ) : (
            <EmptyState
              icon={TrackingIcon}
              title="Nothing tracked yet"
              description="Start tracking shows and they'll appear here."
              actionLabel="Search shows"
              actionTo="/shows/search"
            />
          )}
        </section>
      </PageShell>
    </PullToRefresh>
  );
}

/**
 * Posters scroll sideways on a phone and reflow into a grid on wider screens.
 * A 5-across grid on a 360px screen makes every poster illegible; a snapping
 * rail keeps them at a readable size and signals there's more to see.
 */
function PosterRail({ shows }: { shows: TrackedShowResponse[] }) {
  return (
    <>
      <div className="rail -mx-4 gap-3 px-4 pb-2 no-scrollbar sm:hidden">
        {shows.map((show, i) => (
          <ShowCard
            key={show.show_id}
            show={show}
            index={i}
            className="w-[38vw] min-w-32 max-w-40"
          />
        ))}
      </div>
      <div className="hidden grid-cols-3 gap-3 sm:grid md:grid-cols-4 lg:grid-cols-5">
        {shows.map((show, i) => (
          <ShowCard key={show.show_id} show={show} index={i} />
        ))}
      </div>
    </>
  );
}

function RailSkeleton() {
  return (
    <>
      <div className="rail -mx-4 gap-3 px-4 pb-2 no-scrollbar sm:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-[38vw] min-w-32 max-w-40">
            <ShowCardSkeleton />
          </div>
        ))}
      </div>
      <div className="hidden grid-cols-3 gap-3 sm:grid md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <ShowCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <PageShell className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <TextShimmer className="font-display text-2xl font-bold md:text-3xl">
          Loading your beacon…
        </TextShimmer>
      </div>
      <div className="space-y-2.5">
        <TimelineEventSkeleton />
        <TimelineEventSkeleton />
      </div>
      <RailSkeleton />
    </PageShell>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

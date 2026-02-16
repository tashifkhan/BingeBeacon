"use client";

import { useAuth } from "@/providers/auth-provider";
import { useTimeline } from "@/hooks/use-timeline";
import { useTrackedShows, useFavorites } from "@/hooks/use-tracking";
import { ShowCard, ShowCardSkeleton } from "@/components/show-card";
import {
  TimelineEventCard,
  TimelineEventSkeleton,
} from "@/components/timeline-event";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CalendarDays, Star, Tv, Zap } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return <LandingHero />;
  }

  return <AuthenticatedDashboard username={user?.username ?? ""} />;
}

// ---------- Landing page for unauthenticated users ----------
function LandingHero() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-lg text-center animate-fade-in">
        {/* Beacon glow */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 glow-amber-strong">
          <div className="h-6 w-6 rounded-full bg-primary animate-beacon-pulse" />
        </div>

        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Binge<span className="text-primary">Beacon</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Never miss an episode again. Track your favorite shows, get notified
          about new seasons, and stay ahead of every premiere.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground glow-amber hover:glow-amber-strong font-semibold"
          >
            <Link href="/register">Get Started</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-border/50"
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: Tv, label: "Track Shows" },
            { icon: CalendarDays, label: "Timeline View" },
            { icon: Zap, label: "Instant Alerts" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
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

  const greeting = getGreeting();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-10">
      {/* Header */}
      <div className="animate-fade-in">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {username ? `Hey, ${username}` : "Dashboard"}
        </h1>
      </div>

      {/* Today's Timeline */}
      <section className="animate-fade-in stagger-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Today
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/timeline">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {eventsLoading ? (
          <div className="space-y-3">
            <TimelineEventSkeleton />
            <TimelineEventSkeleton />
          </div>
        ) : todayEvents && todayEvents.length > 0 ? (
          <div className="space-y-3">
            {todayEvents.slice(0, 5).map((event, i) => (
              <TimelineEventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing on your radar today. Enjoy the calm.
            </p>
          </div>
        )}
      </section>

      {/* Favorites */}
      {favorites && favorites.length > 0 && (
        <section className="animate-fade-in stagger-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-primary fill-primary" />
              Favorites
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/tracking">
                Manage <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {favorites.slice(0, 5).map((show, i) => (
              <ShowCard key={show.show_id} show={show} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Tracked Shows */}
      <section className="animate-fade-in stagger-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Tv className="h-5 w-5 text-primary" />
            Tracked Shows
            {tracked && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({tracked.length})
              </span>
            )}
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/tracking">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {trackedLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <ShowCardSkeleton key={i} />
            ))}
          </div>
        ) : tracked && tracked.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {tracked.slice(0, 10).map((show, i) => (
              <ShowCard key={show.show_id} show={show} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Start tracking shows to see them here.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/shows/search">Search Shows</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-10">
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="space-y-3">
        <TimelineEventSkeleton />
        <TimelineEventSkeleton />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <ShowCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

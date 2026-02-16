"use client";

import { useState } from "react";
import { useTimeline, useTimelineRange } from "@/hooks/use-timeline";
import {
  TimelineEventCard,
  TimelineEventSkeleton,
} from "@/components/timeline-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, CalendarRange } from "lucide-react";
import { format, addDays } from "date-fns";

type TimelineTab = "today" | "week" | "upcoming" | "custom";

export default function TimelinePage() {
  const [tab, setTab] = useState<TimelineTab>("today");
  const [customFrom, setCustomFrom] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [customTo, setCustomTo] = useState(
    format(addDays(new Date(), 30), "yyyy-MM-dd")
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          Timeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming episodes and events for your tracked shows
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TimelineTab)}
        className="animate-fade-in stagger-1"
      >
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-xl h-11">
          <TabsTrigger value="today" className="rounded-lg text-xs sm:text-sm">
            Today
          </TabsTrigger>
          <TabsTrigger value="week" className="rounded-lg text-xs sm:text-sm">
            This Week
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-lg text-xs sm:text-sm">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="custom" className="rounded-lg text-xs sm:text-sm">
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <TimelineList range="today" />
        </TabsContent>
        <TabsContent value="week" className="mt-6">
          <TimelineList range="week" />
        </TabsContent>
        <TabsContent value="upcoming" className="mt-6">
          <TimelineList range="upcoming" />
        </TabsContent>
        <TabsContent value="custom" className="mt-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.currentTarget.value)}
                className="h-10 bg-muted/50 border-border/50 rounded-xl"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.currentTarget.value)}
                className="h-10 bg-muted/50 border-border/50 rounded-xl"
              />
            </div>
          </div>
          <CustomTimelineList from={customFrom} to={customTo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimelineList({ range }: { range: "today" | "week" | "upcoming" }) {
  const { data: events, isLoading } = useTimeline(range);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TimelineEventSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarRange className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">
          No events for this time range
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <TimelineEventCard key={event.id} event={event} index={i} />
      ))}
    </div>
  );
}

function CustomTimelineList({ from, to }: { from: string; to: string }) {
  const { data: events, isLoading } = useTimelineRange(from, to);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TimelineEventSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarRange className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">
          No events in this date range
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <TimelineEventCard key={event.id} event={event} index={i} />
      ))}
    </div>
  );
}

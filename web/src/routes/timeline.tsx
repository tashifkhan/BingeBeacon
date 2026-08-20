import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTimeline, useTimelineRange } from "@/hooks/use-timeline";
import {
  TimelineEventCard,
  TimelineEventSkeleton,
} from "@/components/timeline-event";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { PullToRefresh } from "@/components/motion/pull-to-refresh";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, TimelineIcon } from "@/lib/icons";
import { format, addDays } from "date-fns";
import type { TimelineEvent } from "@/types";

type TimelineTab = "today" | "week" | "upcoming" | "custom";

const TABS: { value: TimelineTab; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "upcoming", label: "Upcoming" },
  { value: "custom", label: "Custom" },
];

export const Route = createFileRoute("/timeline")({ component: TimelinePage });

function TimelinePage() {
  const [tab, setTab] = useState<TimelineTab>("today");
  const [customFrom, setCustomFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(
    format(addDays(new Date(), 30), "yyyy-MM-dd")
  );
  const queryClient = useQueryClient();

  return (
    <PullToRefresh
      onRefresh={async () => {
        await queryClient.invalidateQueries({ queryKey: ["timeline"] });
      }}
    >
      <PageShell width="narrow">
        <PageHeader
          title="Timeline"
          icon={TimelineIcon}
          description="Upcoming episodes and events for shows you track."
        />

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TimelineTab)}
          className="animate-fade-in stagger-1"
        >
          {/* Four labels won't fit a 360px row, so the list scrolls
              horizontally on phones and becomes an even grid from sm up. */}
          <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto gap-1 rounded-xl bg-muted/50 p-1 group-data-[orientation=horizontal]/tabs:h-12 sm:grid sm:w-full sm:grid-cols-4">
              {TABS.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-full shrink-0 rounded-lg px-4 text-sm sm:px-2"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="today" className="mt-6">
            <RangeList range="today" />
          </TabsContent>
          <TabsContent value="week" className="mt-6">
            <RangeList range="week" />
          </TabsContent>
          <TabsContent value="upcoming" className="mt-6">
            <RangeList range="upcoming" />
          </TabsContent>
          <TabsContent value="custom" className="mt-6">
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="from" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="from"
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.currentTarget.value)}
                  className="h-11 rounded-xl border-border/60 bg-muted/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="to"
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.currentTarget.value)}
                  className="h-11 rounded-xl border-border/60 bg-muted/50"
                />
              </div>
            </div>
            <CustomRangeList from={customFrom} to={customTo} />
          </TabsContent>
        </Tabs>
      </PageShell>
    </PullToRefresh>
  );
}

function RangeList({ range }: { range: "today" | "week" | "upcoming" }) {
  const { data, isLoading } = useTimeline(range);
  return <EventList events={data} isLoading={isLoading} />;
}

function CustomRangeList({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useTimelineRange(from, to);
  return <EventList events={data} isLoading={isLoading} />;
}

function EventList({
  events,
  isLoading,
}: {
  events: TimelineEvent[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <TimelineEventSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="Nothing scheduled"
        description="No events for this range. Track more shows to fill it out."
        actionLabel="Find shows"
        actionTo="/shows/search"
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((event, i) => (
        <TimelineEventCard key={event.id} event={event} index={i} />
      ))}
    </div>
  );
}

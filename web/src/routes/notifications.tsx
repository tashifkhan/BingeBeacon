import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllRead,
} from "@/hooks/use-notifications";
import {
  NotificationItem,
  NotificationSkeleton,
} from "@/components/notification-item";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { PullToRefresh } from "@/components/motion/pull-to-refresh";
import { Button } from "@/components/ui/button";
import {
  AlertsIcon,
  BellRingIcon,
  CheckAllIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/lib/icons";
import { subscribeToPush } from "@/lib/push";

const PER_PAGE = 20;

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data: paginated, isLoading } = useNotifications({
    page,
    per_page: PER_PAGE,
  });
  const { data: unread } = useUnreadCount();
  const markAllRead = useMarkAllRead();
  const queryClient = useQueryClient();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [enablingPush, setEnablingPush] = useState(false);

  // localStorage is only readable on the client; assume enabled during SSR so
  // the prompt doesn't flash in for people who already turned it on.
  useEffect(() => {
    setPushEnabled(window.localStorage.getItem("bb-push-enabled") === "true");
  }, []);

  async function enablePush() {
    setEnablingPush(true);
    try {
      const enabled = await subscribeToPush();
      if (enabled) {
        window.localStorage.setItem("bb-push-enabled", "true");
        setPushEnabled(true);
        toast.success("Push alerts are on");
      } else {
        toast.error("Push alerts couldn't be enabled");
      }
    } finally {
      setEnablingPush(false);
    }
  }

  const notifications = paginated?.data ?? [];
  const total = paginated?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const unreadCount = unread?.count ?? 0;

  return (
    <PullToRefresh
      onRefresh={async () => {
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }}
    >
      <PageShell width="narrow">
        <PageHeader
          title="Notifications"
          icon={AlertsIcon}
          description={
            unreadCount > 0
              ? `${unreadCount} unread of ${total}`
              : `${total} total`
          }
          actions={
            unreadCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckAllIcon className="mr-1.5 size-4" />
                Mark all read
              </Button>
            ) : undefined
          }
        />

        {/* Push opt-in reads as a card rather than a header button — it's a
            one-time setup step, not a recurring action. */}
        {!pushEnabled && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 animate-fade-in">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BellRingIcon weight="Filled" className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Turn on push alerts</p>
              <p className="text-xs text-muted-foreground">
                Get told the moment a tracked show drops.
              </p>
            </div>
            <Button
              size="sm"
              className="h-9 shrink-0 rounded-lg font-semibold"
              onClick={enablePush}
              disabled={enablingPush}
            >
              {enablingPush ? "Enabling…" : "Enable"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <>
            <div className="space-y-2.5">
              {notifications.map((notif, i) => (
                <NotificationItem key={notif.id} notification={notif} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-6 flex items-center justify-center gap-3"
              >
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous page"
                  className="size-11 rounded-xl"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="min-w-20 text-center text-sm tabular-nums text-muted-foreground">
                  {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next page"
                  className="size-11 rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState
            icon={AlertsIcon}
            title="No notifications yet"
            description="When a show you track has news, it'll land here."
            actionLabel="Track a show"
            actionTo="/shows/search"
          />
        )}
      </PageShell>
    </PullToRefresh>
  );
}

"use client";

import { useState } from "react";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllRead,
} from "@/hooks/use-notifications";
import {
  NotificationItem,
  NotificationSkeleton,
} from "@/components/notification-item";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 20;

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data: paginated, isLoading } = useNotifications({
    page,
    per_page: PER_PAGE,
  });
  const { data: unread } = useUnreadCount();
  const markAllRead = useMarkAllRead();

  const notifications = paginated?.data ?? [];
  const total = paginated?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const unreadCount = unread?.count ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground ml-1">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} total notification{total !== 1 ? "s" : ""}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <>
          <div className="space-y-3">
            {notifications.map((notif, i) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                index={i}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="mb-4 h-12 w-12 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            No notifications yet. They&apos;ll appear here when your shows have updates.
          </p>
        </div>
      )}
    </div>
  );
}

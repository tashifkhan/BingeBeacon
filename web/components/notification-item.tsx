"use client";

import { cn, formatTimeAgo } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarkRead } from "@/hooks/use-notifications";
import type { NotificationResponse } from "@/types";

interface NotificationItemProps {
  notification: NotificationResponse;
  className?: string;
  index?: number;
}

export function NotificationItem({
  notification,
  className,
  index = 0,
}: NotificationItemProps) {
  const markRead = useMarkRead();
  const isUnread = notification.status !== "read";
  const delay = Math.min(index, 6);

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-xl border border-border/50 p-4 transition-all duration-200",
        isUnread
          ? "bg-primary/[0.03] border-primary/10"
          : "bg-card hover:bg-card/80",
        "animate-fade-in",
        `stagger-${delay}`,
        className
      )}
    >
      {/* Icon with unread dot */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Bell
          className={cn(
            "h-4.5 w-4.5",
            isUnread ? "text-primary" : "text-muted-foreground"
          )}
        />
        {isUnread && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary glow-amber" />
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className={cn(
            "text-sm leading-tight",
            isUnread ? "font-semibold" : "font-medium text-muted-foreground"
          )}
        >
          {notification.title}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground/80">
          {notification.body}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Mark as read */}
      {isUnread && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => markRead.mutate(notification.id)}
          disabled={markRead.isPending}
        >
          <CheckCheck className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-border/50 bg-card p-4">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

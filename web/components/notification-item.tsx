import { cn, formatTimeAgo } from "@/lib/utils";
import { AlertsIcon, CheckIcon } from "@/lib/icons";
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
  const isUnread = notification.status === "sent";
  const delay = Math.min(index, 6);

  return (
    <article
      className={cn(
        "flex gap-3 rounded-xl border p-3.5 transition-colors duration-200 sm:p-4",
        isUnread
          ? "border-primary/15 bg-primary/[0.04]"
          : "border-border/50 bg-card",
        "animate-fade-in",
        `stagger-${delay}`,
        className
      )}
    >
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <AlertsIcon
          weight={isUnread ? "Filled" : "Outline"}
          className={cn("size-4.5", isUnread ? "text-primary" : "text-muted-foreground")}
        />
        {isUnread && (
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary glow-amber" />
        )}
      </div>

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
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Previously hover-only, which meant it could never be tapped. */}
      {isUnread && (
        <button
          type="button"
          aria-label={`Mark "${notification.title}" as read`}
          title="Mark as read"
          onClick={() => markRead.mutate(notification.id)}
          disabled={markRead.isPending}
          className="flex size-9 shrink-0 self-start items-center justify-center rounded-lg text-muted-foreground press disabled:opacity-40 can-hover:hover:bg-muted can-hover:hover:text-foreground"
        >
          <CheckIcon className="size-4" />
        </button>
      )}
    </article>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-border/50 bg-card p-3.5 sm:p-4">
      <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

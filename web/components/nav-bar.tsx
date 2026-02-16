"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  CalendarDays,
  Tv,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useAuth } from "@/providers/auth-provider";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shows/search", label: "Search", icon: Search },
  { href: "/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/tracking", label: "Tracking", icon: Tv },
  { href: "/notifications", label: "Alerts", icon: Bell },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  // Don't show nav on auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return null;
  }

  return (
    <>
      {/* Desktop side nav */}
      <nav className="fixed left-0 top-0 z-50 hidden h-full w-18 flex-col items-center gap-1 border-r border-border bg-card/80 py-6 backdrop-blur-xl md:flex">
        {/* Logo mark */}
        <Link
          href="/"
          className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"
        >
          <div className="h-3 w-3 rounded-full bg-primary glow-amber animate-beacon-pulse" />
        </Link>

        <div className="flex flex-1 flex-col items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={isAuthenticated || href === "/shows/search" ? href : "/login"}
                className={cn(
                  "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                {/* Unread badge on bell */}
                {label === "Alerts" && unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {/* Tooltip */}
                <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={isAuthenticated || href === "/shows/search" ? href : "/login"}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
                {label === "Alerts" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        {/* Safe area padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}

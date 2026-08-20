import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING_LAYOUT } from "@/lib/ease";
import {
  AlertsIcon,
  HomeIcon,
  MoreTabIcon,
  SearchIcon,
  TrackingIcon,
  WatchlistIcon,
  type IconComponent,
} from "@/lib/icons";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useAuth } from "@/providers/auth-provider";

type NavItem = {
  href: string;
  label: string;
  icon: IconComponent;
  /** Reachable without an account. */
  public?: boolean;
};

// Five destinations plus a "More" hub. History, Timeline, and settings
// (appearance, push, account) live inside More rather than the bar: a phone
// tab bar stops being tappable past six items, and those are secondary
// destinations rather than daily ones.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon, public: true },
  { href: "/shows/search", label: "Search", icon: SearchIcon, public: true },
  { href: "/watchlist", label: "Watchlist", icon: WatchlistIcon },
  { href: "/tracking", label: "Tracking", icon: TrackingIcon },
  { href: "/notifications", label: "Alerts", icon: AlertsIcon },
  { href: "/more", label: "More", icon: MoreTabIcon, public: true },
];

function useActiveHref() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavBar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isActive = useActiveHref();
  const { isAuthenticated } = useAuth();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  // Auth screens are full-bleed; the app chrome would only get in the way.
  // Theme lives on the auth form itself (and on More once signed in) rather
  // than as a floating overlay that collides with the page header.
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return null;
  }

  const resolve = (item: NavItem) =>
    isAuthenticated || item.public ? item.href : "/login";

  return (
    <>
      <DesktopRail
        items={NAV_ITEMS}
        isActive={isActive}
        resolve={resolve}
        unreadCount={unreadCount}
      />
      <MobileBar
        items={NAV_ITEMS}
        isActive={isActive}
        resolve={resolve}
        unreadCount={unreadCount}
      />
    </>
  );
}

// ---------- Phone: bottom tab bar ----------
function MobileBar({
  items,
  isActive,
  resolve,
  unreadCount,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  resolve: (item: NavItem) => string;
  unreadCount: number;
}) {
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 md:hidden",
        "border-t border-border/80 bg-card/85 backdrop-blur-xl",
        // The bar itself is a fixed height; the inset is padding below it so
        // the tap targets stay clear of the home indicator.
        "pb-safe"
      )}
    >
      <ul className="flex h-nav-bar items-stretch justify-around px-1">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const showBadge = item.label === "Alerts" && unreadCount > 0;

          return (
            <li key={item.href} className="flex-1">
              <Link
                to={resolve(item)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full w-full touch-target flex-col items-center justify-center gap-1 press",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Active pill glides between tabs rather than blinking. */}
                {active && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-primary"
                  />
                )}
                <span className="relative">
                  <Icon
                    className="size-5.5"
                    weight={active ? "Filled" : "Outline"}
                  />
                  {showBadge && <UnreadDot count={unreadCount} />}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---------- Tablet & desktop: left rail ----------
function DesktopRail({
  items,
  isActive,
  resolve,
  unreadCount,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  resolve: (item: NavItem) => string;
  unreadCount: number;
}) {
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-50 hidden w-nav-rail flex-col items-center border-r border-border/80 bg-card/80 py-6 backdrop-blur-xl md:flex"
    >
      <Link
        to="/"
        aria-label="BingeBeacon home"
        className="mb-8 flex size-10 items-center justify-center rounded-xl bg-primary/10"
      >
        <span className="size-3 animate-beacon-pulse rounded-full bg-primary glow-amber" />
      </Link>

      <ul className="flex flex-1 flex-col items-center gap-1">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const showBadge = item.label === "Alerts" && unreadCount > 0;

          return (
            <li key={item.href}>
              <Link
                to={resolve(item)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex size-12 items-center justify-center rounded-xl transition-colors duration-200",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="rail-nav-active"
                    transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                    className="absolute inset-0 rounded-xl bg-primary/15"
                  />
                )}
                <span className="relative">
                  <Icon
                    className="size-5"
                    weight={active ? "Filled" : "Outline"}
                  />
                  {showBadge && <UnreadDot count={unreadCount} />}
                </span>

                {/* Tooltip — pointer-only, so it never traps a touch user. */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity can-hover:block group-hover:opacity-100"
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UnreadDot({ count }: { count: number }) {
  return (
    <AnimatePresence>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground"
      >
        {count > 99 ? "99+" : count}
        <span className="sr-only"> unread notifications</span>
      </motion.span>
    </AnimatePresence>
  );
}

import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { IconComponent } from "@/lib/icons";

/**
 * The shared page frame. Every route used to hand-roll its own container,
 * padding and heading, which is how `/watchlist` and `/history` drifted into
 * a different visual language from the rest of the app.
 */
export function PageShell({
  children,
  className,
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  /** `wide` for poster grids, `narrow` for single-column lists. */
  width?: "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-5 sm:px-6 md:py-10",
        width === "wide" ? "max-w-5xl" : "max-w-3xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  count,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: IconComponent;
  count?: number;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 animate-fade-in", className)}>
      {/* Actions wrap under the title on narrow screens instead of squeezing
          it into a two-character-wide column. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* The glyph sits in a tinted chip rather than floating loose beside
              the text — it gives each page a consistent, deliberate anchor. */}
          {Icon && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15 md:size-11">
              <Icon
                weight="Filled"
                className="size-5 text-primary md:size-5.5"
              />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-display text-[1.375rem] font-bold leading-tight tracking-tight sm:text-2xl md:text-3xl">
              <span className="min-w-0 truncate">{title}</span>
              {count !== undefined && (
                <AnimatedNumber
                  value={count}
                  className="shrink-0 text-base font-normal tabular-nums text-muted-foreground md:text-lg"
                />
              )}
            </h1>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  className,
}: {
  icon: IconComponent;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: LinkProps["to"];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center animate-fade-in",
        className
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60">
        <Icon className="size-7 text-muted-foreground/50" />
      </div>
      <p className="font-display text-base font-semibold">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {actionLabel && actionTo && (
        <Button asChild variant="outline" className="mt-5 h-11 rounded-xl px-5">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}

/** Consistent section heading with an optional "view all" affordance. */
export function SectionHeader({
  title,
  icon: Icon,
  count,
  actionLabel,
  actionTo,
  className,
}: {
  title: string;
  icon?: IconComponent;
  count?: number;
  actionLabel?: string;
  actionTo?: LinkProps["to"];
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="flex min-w-0 items-center gap-2 font-display text-base font-semibold sm:text-lg">
        {Icon && <Icon weight="Filled" className="size-5 shrink-0 text-primary" />}
        <span className="truncate">{title}</span>
        {count !== undefined && (
          <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </h2>
      {actionLabel && actionTo && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mr-2 h-9 shrink-0 text-muted-foreground"
        >
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}

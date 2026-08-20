import { cn } from "@/lib/utils";

/**
 * The BingeBeacon mark: a lamp throwing a beam upward.
 *
 * It fuses both halves of the name — the beam doubles as a play triangle, the
 * lamp is the beacon. Drawn in `currentColor` with the beam at reduced opacity
 * so a single glyph works on any background in either theme, and so it still
 * reads when it collapses to 16px in a browser tab.
 */
export function LogoMark({
  className,
  animated = false,
}: {
  className?: string;
  /** Pulse the lamp, as on the landing and auth screens. */
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      {/* Beam — a cone opening upward, softened at the mouth. */}
      <path
        d="M12 16.2 L6.9 5.4 C10.2 4.2 13.8 4.2 17.1 5.4 Z"
        fill="currentColor"
        opacity="0.32"
      />
      {/* Lamp */}
      <circle
        cx="12"
        cy="16.8"
        r="3.1"
        fill="currentColor"
        className={animated ? "animate-beacon-pulse" : undefined}
      />
    </svg>
  );
}

/** Mark plus wordmark, for headers and auth screens. */
export function Logo({
  className,
  markClassName,
  showWordmark = true,
  animated = false,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  animated?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark
        animated={animated}
        className={cn("size-7 text-primary", markClassName)}
      />
      {showWordmark && (
        <span className="font-display text-xl font-bold tracking-tight">
          Binge<span className="text-primary">Beacon</span>
        </span>
      )}
    </span>
  );
}

/** The mark inside its amber tile — used where it needs to read as an app icon. */
export function LogoTile({
  className,
  markClassName,
  animated = false,
}: {
  className?: string;
  markClassName?: string;
  animated?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15",
        className
      )}
    >
      <LogoMark
        animated={animated}
        className={cn("size-1/2 text-primary", markClassName)}
      />
    </span>
  );
}

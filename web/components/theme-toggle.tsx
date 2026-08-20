import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion, useReducedMotion } from "motion/react";
import { flushSync } from "react-dom";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon, SystemIcon, type IconComponent } from "@/lib/icons";

type ThemeChoice = "light" | "dark" | "system";

const CHOICES: { value: ThemeChoice; label: string; icon: IconComponent }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: SystemIcon },
];

/**
 * Crossfades the page between themes where the browser supports it.
 * `flushSync` forces the class swap inside the transition's capture window.
 */
function useThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  // The server can't know the stored choice, so the selected state is only
  // rendered after mount to keep hydration honest.
  useEffect(() => setMounted(true), []);

  const current = (theme as ThemeChoice) ?? "system";

  function apply(next: ThemeChoice) {
    if (next === current) return;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (!reduce && typeof doc.startViewTransition === "function") {
      doc.startViewTransition(() => flushSync(() => setTheme(next)));
      return;
    }
    setTheme(next);
  }

  return { current, apply, mounted, reduce };
}

/**
 * Full-width labelled theme picker for the More / settings screen.
 *
 * Three visible options rather than a cycling button: a two-state toggle can't
 * express "follow the OS", which is the setting most people actually want.
 */
export function ThemePicker({ className }: { className?: string }) {
  const { current, apply, mounted, reduce } = useThemeSwitcher();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-card p-1.5",
        className
      )}
    >
      {CHOICES.map(({ value, label, icon: Icon }) => {
        const active = mounted && current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => apply(value)}
            className={cn(
              "relative flex h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors press",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground can-hover:hover:bg-muted/60 can-hover:hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-choice-picker"
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                className="absolute inset-0 rounded-lg bg-primary shadow-sm"
              />
            )}
            <Icon
              weight={active ? "Filled" : "Outline"}
              className="relative size-5"
            />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact icon-only segmented control. Meant to sit *inside* a layout
 * (auth footer, desktop rail) — never as a floating chrome overlay.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { current, apply, mounted, reduce } = useThemeSwitcher();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/50 p-1",
        className
      )}
    >
      {CHOICES.map(({ value, label, icon: Icon }) => {
        const active = mounted && current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => apply(value)}
            className={cn(
              "relative flex size-8 items-center justify-center rounded-full transition-colors",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground can-hover:hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-choice-compact"
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            <Icon
              weight={active ? "Filled" : "Outline"}
              className="relative size-3.5"
            />
          </button>
        );
      })}
    </div>
  );
}

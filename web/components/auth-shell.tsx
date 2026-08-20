import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { EyeIcon, AlertIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Shared chrome for the sign-in and sign-up screens. */
export function AuthShell({
  subtitle,
  children,
  footer,
}: {
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-10 pt-safe">
      <div className="mx-auto w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 glow-amber">
              <span className="size-4 animate-beacon-pulse rounded-full bg-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Binge<span className="text-primary">Beacon</span>
            </h1>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {children}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </p>

        {/* Theme sits in the page flow under the form — no floating top
            chrome that fights the logo or the status bar. */}
        <div className="mt-8 flex flex-col items-center gap-2 border-t border-border/50 pt-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Appearance
          </p>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in"
    >
      <AlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Password field with a reveal toggle — on a phone, where typos are frequent
 * and the keyboard hides half the screen, being able to check what you typed
 * matters more than the shoulder-surfing risk.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className={cn(
          "h-12 rounded-xl border-border/60 bg-muted/50 pr-12",
          className
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground press can-hover:hover:text-foreground"
      >
        <EyeIcon
          weight={visible ? "Filled" : "Outline"}
          className="size-4.5"
        />
      </button>
    </div>
  );
}

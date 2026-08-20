import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/use-auth";
import { PageShell, PageHeader } from "@/components/page-shell";
import { ThemePicker } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { subscribeToPush } from "@/lib/push";
import {
  BellRingIcon,
  ChevronRightIcon,
  HistoryIcon,
  SettingsIcon,
  SignOutIcon,
  TimelineIcon,
  WatchlistIcon,
  type IconComponent,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/more")({ component: MorePage });

const BROWSE_LINKS: {
  to: LinkProps["to"];
  label: string;
  hint: string;
  icon: IconComponent;
}[] = [
  {
    to: "/timeline",
    label: "Timeline",
    hint: "What's airing and when",
    icon: TimelineIcon,
  },
  {
    to: "/history",
    label: "Watch history",
    hint: "Everything you've marked watched",
    icon: HistoryIcon,
  },
  {
    to: "/watchlist",
    label: "Watchlist",
    hint: "Queued up to watch next",
    icon: WatchlistIcon,
  },
];

function MorePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();

  return (
    <PageShell width="narrow" className="flex flex-col gap-8">
      <PageHeader
        title="More"
        description="Settings, extras, and account"
        icon={SettingsIcon}
      />

      {isAuthenticated && user && (
        <Section title="Account">
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-lg font-bold text-primary"
            >
              {user.username.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{user.username}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </Section>
      )}

      <Section
        title="Appearance"
        hint="System follows your device's light or dark setting."
      >
        <ThemePicker />
      </Section>

      <Section title="Browse">
        <ul className="overflow-hidden rounded-xl border border-border/60 bg-card">
          {BROWSE_LINKS.map(({ to, label, hint, icon: Icon }, i) => (
            <li key={label}>
              {i > 0 && <Separator />}
              <Link
                to={to}
                className="flex touch-target items-center gap-3 px-4 py-3.5 press can-hover:hover:bg-muted/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon weight="Filled" className="size-4.5 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {hint}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Notifications">
        <PushSetting />
      </Section>

      <Section title="About">
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
          <LogoMark className="size-9 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold">
              Binge<span className="text-primary">Beacon</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Never miss an episode again.
            </p>
          </div>
        </div>
      </Section>

      {isAuthenticated && (
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl text-destructive can-hover:hover:bg-destructive/10 can-hover:hover:text-destructive"
          disabled={logout.isPending}
          onClick={() => {
            logout.mutate(undefined, {
              onSuccess: () => {
                toast.success("Signed out");
                void navigate({ to: "/" });
              },
              onError: () => toast.error("Couldn't sign out"),
            });
          }}
        >
          <SignOutIcon className="mr-2 size-4" />
          Sign out
        </Button>
      )}
    </PageShell>
  );
}

function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("animate-fade-in", className)}>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </section>
  );
}

function PushSetting() {
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  // localStorage is client-only; assume enabled during SSR so the prompt
  // doesn't flash in for people who already turned it on.
  useEffect(() => {
    setEnabled(window.localStorage.getItem("bb-push-enabled") === "true");
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const ok = await subscribeToPush();
      if (ok) {
        window.localStorage.setItem("bb-push-enabled", "true");
        setEnabled(true);
        toast.success("Push alerts are on");
      } else {
        toast.error("Push alerts couldn't be enabled");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <BellRingIcon weight="Filled" className="size-4.5 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Push alerts</p>
        <p className="text-xs text-muted-foreground">
          {enabled
            ? "You'll be told when a tracked show drops."
            : "Get told the moment a tracked show drops."}
        </p>
      </div>
      {enabled ? (
        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
          On
        </span>
      ) : (
        <Button
          size="sm"
          className="h-9 shrink-0 rounded-lg font-semibold"
          onClick={enable}
          disabled={busy}
        >
          {busy ? "Enabling…" : "Enable"}
        </Button>
      )}
    </div>
  );
}

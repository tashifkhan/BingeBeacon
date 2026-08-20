import plusJakartaCss from "@fontsource-variable/plus-jakarta-sans/index.css?url";
import soraCss from "@fontsource-variable/sora/index.css?url";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import appCss from "@/src/styles/globals.css?url";
import { NavBar } from "@/components/nav-bar";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const APP_NAME = "BingeBeacon";
const APP_DESCRIPTION =
  "Track your favorite TV shows and movies. Get notified about new episodes, seasons, and more.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        // No `maximum-scale`/`user-scalable=no`: blocking pinch-zoom is a
        // WCAG 1.4.4 failure. iOS field-focus zoom is handled in CSS instead
        // by keeping inputs at 16px on small screens.
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { name: "application-name", content: APP_NAME },
      // Browser chrome follows the OS palette. Two media-scoped tags is the
      // only way to express this declaratively.
      {
        name: "theme-color",
        content: "#FBFAF8",
        media: "(prefers-color-scheme: light)",
      },
      {
        name: "theme-color",
        content: "#0B0F1A",
        media: "(prefers-color-scheme: dark)",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: soraCss },
      { rel: "stylesheet", href: plusJakartaCss },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      // SVG first for capable browsers, .ico as the universal fallback
      // (it also covers the bare /favicon.ico that crawlers still request).
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
  }),
  component: RootDocument,
  notFoundComponent: NotFoundPage,
});

function RootDocument() {
  return (
    // next-themes writes the theme class onto <html> before paint, so the
    // server markup and first client render legitimately differ here.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <NavBar />
              {/* Bottom nav on phones, left rail from md up. `pb-nav` also
                  clears the iOS home indicator. */}
              <main className="min-h-dvh pb-nav md:pb-0 md:pl-nav-rail">
                <Outlet />
              </main>
              {/* Toasts sit bottom-centre on phones so they never cover the
                  header actions, and top-right once there's room. */}
              <Toaster
                position="bottom-center"
                mobileOffset={{ bottom: "5rem" }}
                toastOptions={{
                  className: "bg-popover border-border text-foreground",
                }}
              />
              <ServiceWorkerRegistration />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 h-4 w-4 rounded-full bg-primary glow-amber" />
      <h1 className="font-display text-2xl font-bold">Signal not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This BingeBeacon route is off the air.
      </p>
    </div>
  );
}

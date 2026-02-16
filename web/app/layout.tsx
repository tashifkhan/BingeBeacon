import type { Metadata, Viewport } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { NavBar } from "@/components/nav-bar";
import { Toaster } from "@/components/ui/sonner";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const APP_NAME = "BingeBeacon";
const APP_DESCRIPTION =
  "Track your favorite TV shows and movies. Get notified about new episodes, seasons, and more.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_NAME,
      template: `%s | ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head />
      <body
        className={`${sora.variable} ${jakarta.variable} min-h-dvh`}
      >
        <QueryProvider>
          <AuthProvider>
            <NavBar />
            {/* Main content area with nav offsets */}
            <main className="min-h-dvh pb-20 md:pb-0 md:pl-18">
              {children}
            </main>
            <Toaster
              position="top-right"
              toastOptions={{
                className: "bg-card border-border text-foreground",
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

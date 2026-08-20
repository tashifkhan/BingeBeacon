import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Theme provider backed by `next-themes` (framework-agnostic despite the
 * name). It handles the parts that are easy to get subtly wrong by hand:
 * following the OS when set to "system", syncing across tabs, and writing the
 * class before first paint so there's no flash of the wrong theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Transitions on every themed surface would otherwise all fire at once
      // mid-switch and smear; the view transition handles the crossfade.
      disableTransitionOnChange
      storageKey="bb-theme"
    >
      {children}
    </NextThemesProvider>
  );
}

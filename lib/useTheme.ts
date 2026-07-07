"use client";

/**
 * React-facing wrapper around `lib/theme.ts`'s framework-agnostic
 * controller. Owns nothing itself beyond wiring the controller into
 * React's render cycle (via `useSyncExternalStore`) and applying the
 * `dark` class to `<html>` so Tailwind's `dark:` variant and the CSS
 * custom properties in `globals.css` respond to it.
 *
 * A single module-level controller instance is shared by every component
 * that calls `useTheme()`, so the theme stays in sync app-wide - the same
 * pattern `AppProvider` uses for its repository singleton.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createThemeController, DEFAULT_THEME, type Theme } from "@/lib/theme";

const controller = createThemeController();

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const theme = useSyncExternalStore(
    controller.subscribe,
    controller.getTheme,
    getServerSnapshot,
  );

  // Reflect the current theme onto <html> so `dark:` utilities and the
  // `.dark` CSS variable overrides apply globally. The server always
  // renders with the `dark` class present (see layout.tsx) so there is no
  // flash on first load; this effect only needs to act when the client
  // theme diverges from that default.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    controller.toggle();
  }, []);

  return { theme, toggleTheme };
}

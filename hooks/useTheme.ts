"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBrowserStorage,
  readStoredTheme,
  writeStoredTheme,
  type Theme,
} from "@/lib/theme";

export interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/** Adds/removes the `dark` class on <html> so Tailwind's `dark:` variant applies globally. */
function applyThemeClass(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Owns the `light` | `dark` theme state: reads/writes it via the
 * localStorage-backed port in `lib/theme`, and applies the `dark` class to
 * `<html>` as a side effect. The lazy `useState` initializer reads the
 * stored preference directly (falling back to "dark" during SSR/when
 * storage is unavailable) so the very first client render already has the
 * right value - no cascading setState from within an effect. A single
 * effect then synchronizes external systems (the DOM class and storage)
 * whenever the theme changes, including once on mount.
 */
export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>(() =>
    readStoredTheme(getBrowserStorage()),
  );

  useEffect(() => {
    applyThemeClass(theme);
    writeStoredTheme(getBrowserStorage(), theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme, setTheme };
}

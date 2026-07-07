"use client";

/**
 * Owns the app's `'light' | 'dark'` theme state: initializes from
 * localStorage (via `readTheme`), applies the `dark` class to `<html>` as a
 * side effect, and exposes a `toggleTheme` action that flips and persists
 * the preference.
 *
 * All the actual read/write/toggle logic lives in `lib/theme.ts` (a plain,
 * SSR-safe module) so it can be unit tested without a DOM. This hook is a
 * thin React wrapper around that logic.
 */
import { useCallback, useEffect, useState } from "react";
import { readTheme, toggleTheme as toggleThemeValue, writeTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

export function useTheme() {
  // Lazy initializer runs once on mount; on the server this reads
  // `DEFAULT_THEME` (SSR-safe, no `window`), matching the `dark` class the
  // server already renders on `<html>` so there is no mismatch.
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  // Keep `<html class="dark">` in sync with state on every change,
  // including the initial client-side read from localStorage.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = toggleThemeValue(prev);
      writeTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

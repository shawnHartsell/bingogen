"use client";

/**
 * Owns the light/dark theme state: reads/writes the preference through
 * `lib/theme` (localStorage-backed, SSR-safe) and applies the `dark` class
 * to `<html>` so Tailwind's `dark:` variant and the `.dark` CSS overrides
 * in globals.css take effect.
 *
 * The persistence/defaulting rules live in `lib/theme.ts` and are unit
 * tested there; this hook is a thin React + DOM wrapper around them.
 */
import { useCallback, useEffect, useState } from "react";
import type { StorageLike } from "@/lib/cardRepository";
import { readTheme, toggleThemeValue, writeTheme, type Theme } from "@/lib/theme";

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Some browsers (e.g. Safari private mode) throw on access.
    return null;
  }
}

function applyThemeClass(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeResult {
  // Lazy initializer reads localStorage synchronously during the client's
  // initial render (including hydration), so there's no flash for a
  // returning user - and it safely defaults to "dark" during SSR, where
  // there is no `window`, preserving today's default appearance.
  const [theme, setTheme] = useState<Theme>(() =>
    readTheme(getBrowserStorage()),
  );

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = toggleThemeValue(prev);
      writeTheme(getBrowserStorage(), next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

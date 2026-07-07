"use client";

/**
 * `useTheme` owns the light/dark theme preference: it reads/writes the
 * choice to localStorage and applies the `dark` class to `<html>` so
 * Tailwind's `dark:` variant and the `.dark` CSS overrides in globals.css
 * take effect.
 *
 * Dark is the default (preserving the app's original hardcoded look) when
 * there is no stored preference, or the stored value is not recognized.
 * SSR-safe: reading/writing localStorage and touching `document` are guarded
 * behind `typeof window` checks so this never throws during server render.
 */
import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "bingogen.theme.v1";

export type Theme = "light" | "dark";

export interface UseThemeResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "dark";
  } catch {
    // Storage unavailable (e.g. Safari private mode): fall back to default.
    return "dark";
  }
}

function applyThemeClass(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function persistTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore write failures (e.g. quota/private mode) - theme still applies
    // for the current session, it just won't persist.
  }
}

export function useTheme(): UseThemeResult {
  // Lazily initialize from localStorage so the very first render already
  // reflects a stored preference (no flash of the wrong theme on rehydrate).
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  // Keep the `dark` class on <html> in sync with the current theme.
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}

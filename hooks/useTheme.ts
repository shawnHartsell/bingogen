"use client";

import { useEffect, useState } from "react";
import type { StorageLike } from "@/lib/cardRepository";
import {
  applyThemeClass,
  getStoredTheme,
  persistTheme,
  resolveThemeStorage,
  type Theme,
} from "@/lib/theme";

/**
 * Owns the light/dark theme: rehydrates the persisted preference after
 * mount (localStorage isn't reachable during SSR), applies the `dark`
 * class to <html> whenever it changes, and exposes a toggle.
 *
 * State starts as "dark" so the very first client render matches the
 * server-rendered markup (`<html class="dark">` in the root layout) and
 * avoids a hydration mismatch; the real preference is applied a tick
 * later via the rehydrate effect.
 */
export function useTheme(storageOverride?: StorageLike) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getStoredTheme(resolveThemeStorage(storageOverride)));
    // Only ever meant to run once, on mount, to rehydrate from storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  function toggleTheme(): void {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      persistTheme(resolveThemeStorage(storageOverride), next);
      return next;
    });
  }

  return { theme, toggleTheme };
}

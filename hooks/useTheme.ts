"use client";

import { useCallback, useEffect, useState } from "react";
import type { StorageLike } from "@/lib/cardRepository";
import { getInitialTheme, persistTheme, toggleTheme, type Theme } from "@/lib/theme";

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

/**
 * Owns the `'light' | 'dark'` theme state: reads/writes localStorage and
 * applies the `dark` class to `<html>`. The server-rendered/first-paint
 * value is always "dark" (matching the `<html className="dark">` default
 * in the root layout), then this rehydrates from localStorage on mount -
 * so there's no visible flash for returning users, and first-time users
 * keep the current dark appearance.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>("dark");
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate from localStorage once on mount. This intentionally updates
  // state from an effect: the stored theme can only be read once
  // `localStorage` exists (client-only), and the server/first-paint value
  // must stay "dark" to match `<html className="dark">` and avoid a
  // flash of the wrong theme - see hooks/useTheme.ts and the inline
  // anti-flash script in app/layout.tsx.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- required to rehydrate from localStorage (client-only) without a flash of the wrong theme; see comment above.
    setTheme(getInitialTheme(getBrowserStorage()));
    setHydrated(true);
  }, []);

  // Apply + persist on every change, but only after rehydration - otherwise
  // the initial "dark" default would immediately overwrite a stored
  // "light" preference before it's had a chance to load.
  useEffect(() => {
    if (!hydrated) return;
    applyThemeClass(theme);
    persistTheme(getBrowserStorage(), theme);
  }, [theme, hydrated]);

  const toggle = useCallback(() => {
    setTheme((prev) => toggleTheme(prev));
  }, []);

  return { theme, toggle };
}

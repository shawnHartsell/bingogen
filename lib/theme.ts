/**
 * Light/dark theme preference: pure, storage-backed logic (mirrors the
 * cardRepository pattern). Kept free of React/DOM so it's testable via a
 * plain injectable StorageLike, and reused by the `useTheme` hook which
 * layers browser storage + `document.documentElement` class application
 * on top.
 */
import type { StorageLike } from "@/lib/cardRepository";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "bingogen.theme.v1";

/** Dark is the default so first load preserves the app's current appearance. */
const DEFAULT_THEME: Theme = "dark";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Reads the persisted theme, if any. Falls back to the default (dark) when
 * storage is unavailable (SSR), empty, or holds a malformed value.
 */
export function getInitialTheme(storage: StorageLike | null): Theme {
  if (!storage) return DEFAULT_THEME;
  const raw = storage.getItem(THEME_STORAGE_KEY);
  return isTheme(raw) ? raw : DEFAULT_THEME;
}

/** Persists the theme so it can be rehydrated on the next load. No-op during SSR. */
export function persistTheme(
  storage: StorageLike | null,
  theme: Theme,
): void {
  if (!storage) return;
  storage.setItem(THEME_STORAGE_KEY, theme);
}

/** Flips between the two supported themes. */
export function toggleTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/**
 * Pure, storage-backed logic for the light/dark theme preference.
 *
 * Kept separate from the `useTheme` hook (which owns the DOM/`<html>` class
 * side effect) so the persistence and defaulting rules can be unit tested
 * without a browser/DOM environment - mirroring the pattern used by
 * `cardRepository`.
 */
import type { StorageLike } from "@/lib/cardRepository";

export type Theme = "light" | "dark";

/**
 * Exported so the no-flash inline bootstrap script in `app/layout.tsx` can
 * read the same key without duplicating the string literal.
 */
export const THEME_STORAGE_KEY = "bingogen.theme.v1";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Reads the persisted theme preference. Defaults to `"dark"` when storage
 * is unavailable (SSR) or the stored value is missing/invalid, preserving
 * the app's current appearance on first load.
 */
export function readTheme(storage: StorageLike | null): Theme {
  if (!storage) return "dark";
  const raw = storage.getItem(THEME_STORAGE_KEY);
  return isTheme(raw) ? raw : "dark";
}

/** Persists the theme preference. No-ops when storage is unavailable (SSR). */
export function writeTheme(storage: StorageLike | null, theme: Theme): void {
  if (!storage) return;
  storage.setItem(THEME_STORAGE_KEY, theme);
}

/** Pure toggle: flips `dark` <-> `light`. */
export function toggleThemeValue(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

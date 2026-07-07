/**
 * localStorage-backed theme preference logic, following the same pattern as
 * `cardRepository.ts`: SSR-safe (no `window`/`localStorage` access during
 * server render) and swappable via a `StorageLike` override so tests can
 * exercise the same contract against an in-memory backing.
 */
import type { StorageLike } from "@/lib/cardRepository";

export type Theme = "light" | "dark";

const THEME_KEY = "bingogen.theme.v1";

/** Dark mode is the default, preserving the app's original appearance. */
export const DEFAULT_THEME: Theme = "dark";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Some browsers (e.g. Safari private mode) throw on access.
    return null;
  }
}

/**
 * Reads the persisted theme preference. Falls back to `DEFAULT_THEME` when
 * nothing is stored, the value is malformed, or storage is unavailable
 * (e.g. during SSR) - never throws.
 */
export function readTheme(storageOverride?: StorageLike): Theme {
  const storage = storageOverride ?? getBrowserStorage();
  if (!storage) return DEFAULT_THEME;

  let raw: string | null;
  try {
    raw = storage.getItem(THEME_KEY);
  } catch {
    return DEFAULT_THEME;
  }

  return isTheme(raw) ? raw : DEFAULT_THEME;
}

/**
 * Persists the theme preference. A no-op (never throws) when storage is
 * unavailable, so a write attempted during SSR is harmless.
 */
export function writeTheme(theme: Theme, storageOverride?: StorageLike): void {
  const storage = storageOverride ?? getBrowserStorage();
  if (!storage) return;
  try {
    storage.setItem(THEME_KEY, theme);
  } catch {
    // Persisting a theme preference is best-effort; a failed write (e.g.
    // quota exceeded) should not crash the toggle.
  }
}

/** Returns the other theme - the result of toggling `theme`. */
export function toggleTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

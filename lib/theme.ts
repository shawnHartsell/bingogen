/**
 * Pure theme persistence logic, mirroring the localStorage-port pattern
 * used by `cardRepository`: reads/writes go through a minimal StorageLike
 * interface so tests can exercise the contract without a real browser.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "bingogen.theme.v1";

/** Minimal surface of the Web Storage API this module depends on. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

/** Reads the persisted theme. Defaults to "dark" when unset, invalid, or unavailable. */
export function readStoredTheme(storage: StorageLike | null): Theme {
  if (!storage) return "dark";
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : "dark";
  } catch {
    return "dark";
  }
}

/** Persists the theme. Silently no-ops if storage is unavailable or the write fails. */
export function writeStoredTheme(
  storage: StorageLike | null,
  theme: Theme,
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Best-effort: theme just won't persist across reloads.
  }
}

/** Resolves the real browser localStorage, or null during SSR / when unavailable. */
export function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Some browsers (e.g. Safari private mode) throw on access.
    return null;
  }
}

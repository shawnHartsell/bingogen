/**
 * Pure, SSR-safe theme persistence logic backing the `useTheme` hook.
 *
 * Kept free of React so behavior (initial value, rehydrate, toggle,
 * persist) can be exercised directly in tests against an in-memory
 * StorageLike, the same pattern used by `cardRepository`. The React hook
 * is a thin `useState`/`useEffect` wrapper around these functions.
 */
import type { StorageLike } from "@/lib/cardRepository";

export type Theme = "light" | "dark";

const THEME_KEY = "bingogen.theme.v1";

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Some browsers (e.g. Safari private mode) throw on access.
    return null;
  }
}

/** Resolves the storage to use: an explicit override (tests) or the browser's. */
export function resolveThemeStorage(
  storageOverride?: StorageLike,
): StorageLike | null {
  return storageOverride ?? getBrowserStorage();
}

/** Dark is the default: no stored preference (or an unrecognized value) means dark. */
export function getStoredTheme(storage: StorageLike | null): Theme {
  if (!storage) return "dark";
  return storage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function persistTheme(
  storage: StorageLike | null,
  theme: Theme,
): void {
  storage?.setItem(THEME_KEY, theme);
}

/**
 * Applies the theme to <html> by toggling the `dark` class that both
 * Tailwind's `dark:` variant and globals.css's `.dark` overrides match on.
 * No-op during SSR (no `document`).
 */
export function applyThemeClass(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Framework-agnostic light/dark theme logic, backed by localStorage.
 *
 * SSR-safe: `window`/`localStorage` do not exist during server render, so
 * reads fall back to the default theme and writes are silently skipped,
 * mirroring the pattern used by `cardRepository`.
 *
 * The React-facing `useTheme` hook (see `lib/useTheme.ts`) is a thin
 * wrapper around `createThemeController` via `useSyncExternalStore`. All
 * the actual logic - initial value, toggling, and persistence - lives
 * here so it can be unit tested directly, without rendering a component.
 */
import type { StorageLike } from "@/lib/cardRepository";

export type Theme = "light" | "dark";

export const THEME_KEY = "bingogen.theme.v1";

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

/** Reads the persisted theme, defaulting to dark when absent/invalid/unavailable. */
export function readTheme(storage: StorageLike | null): Theme {
  if (!storage) return DEFAULT_THEME;
  const raw = storage.getItem(THEME_KEY);
  return isTheme(raw) ? raw : DEFAULT_THEME;
}

/** Persists the theme. Best-effort: a failed write never throws or crashes the toggle. */
export function writeTheme(storage: StorageLike | null, theme: Theme): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore write failures (e.g. quota exceeded) - the in-memory theme
    // still applies for the current session.
  }
}

/** Public interface the `useTheme` hook is built on top of. */
export interface ThemeController {
  getTheme(): Theme;
  setTheme(theme: Theme): void;
  toggle(): void;
  subscribe(listener: () => void): () => void;
}

/**
 * Creates a standalone theme controller. Pass `storageOverride` (e.g. an
 * in-memory `StorageLike`) in tests; omit it in the browser to use
 * `window.localStorage`.
 */
export function createThemeController(
  storageOverride?: StorageLike,
): ThemeController {
  const storage = storageOverride ?? getBrowserStorage();
  let theme = readTheme(storage);
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  const controller: ThemeController = {
    getTheme() {
      return theme;
    },
    setTheme(next) {
      if (next === theme) return;
      theme = next;
      writeTheme(storage, theme);
      notify();
    },
    toggle() {
      controller.setTheme(theme === "dark" ? "light" : "dark");
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return controller;
}

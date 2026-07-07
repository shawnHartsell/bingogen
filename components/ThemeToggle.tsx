"use client";

import { useTheme } from "@/hooks/useTheme";

/**
 * Global light/dark mode toggle. Fixed in the corner so it's reachable from
 * every page without competing with page-level layout. Rendered once from
 * the root layout, so the same `useTheme` instance (and its `dark` class
 * application to `<html>`) covers the whole app.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed top-3 right-3 z-50 rounded-full border border-zinc-300 dark:border-zinc-700 bg-background/80 p-2 text-foreground shadow-sm backdrop-blur hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-colors"
    >
      {isDark ? (
        // Sun icon - shown in dark mode to indicate switching to light.
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon icon - shown in light mode to indicate switching to dark.
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}

"use client";

import { useTheme } from "@/lib/useTheme";

/**
 * Icon button that switches between light and dark mode. Rendered once,
 * globally, in the root layout so it's reachable from every page.
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
      className="fixed top-3 right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-background/80 text-base text-foreground shadow-sm backdrop-blur transition-colors hover:bg-zinc-200/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}

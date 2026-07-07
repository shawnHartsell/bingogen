"use client";

import { useTheme } from "@/hooks/useTheme";

/**
 * Accessible light/dark toggle, rendered once in the root layout so it's
 * reachable from every page. A native <button> is keyboard-reachable by
 * default; `aria-label` communicates the action (not just current state)
 * since the icon alone isn't accessible text.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed right-3 top-3 z-50 rounded-md border border-zinc-300 bg-white/80 p-2 text-lg leading-none text-zinc-600 shadow-sm backdrop-blur transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <span aria-hidden="true">{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}

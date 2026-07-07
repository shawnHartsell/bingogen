"use client";

import { useTheme } from "@/components/useTheme";

/**
 * Global light/dark mode toggle. A plain, keyboard-reachable <button> with
 * an aria-label describing the action it performs (not the current state),
 * so screen reader users hear "Switch to light mode" / "Switch to dark
 * mode" rather than an ambiguous status label.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="rounded-md border border-zinc-300 dark:border-zinc-700 p-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}

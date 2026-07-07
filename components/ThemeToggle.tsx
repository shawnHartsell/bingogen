"use client";

import { useTheme } from "@/hooks/useTheme";

/**
 * Accessible light/dark toggle. A native <button> is keyboard-reachable by
 * default (Tab + Enter/Space); the aria-label always names the action the
 * click will perform (i.e. the theme it switches *to*), which also updates
 * live for screen reader users after each toggle.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-1.5 text-sm text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}

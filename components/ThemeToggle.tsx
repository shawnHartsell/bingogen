"use client";

import { useTheme } from "@/hooks/useTheme";

/**
 * A visible, keyboard-reachable button that switches between light and
 * dark mode. Uses a native <button> (focusable and activatable via
 * Enter/Space by default) with an aria-label describing the action it
 * performs next, so assistive tech announces something meaningful
 * regardless of the current theme.
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
      className="rounded-md p-2 text-lg leading-none text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
    >
      <span aria-hidden="true">{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}

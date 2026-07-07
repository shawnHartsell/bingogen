"use client";

import { useTheme } from "@/hooks/useTheme";

/**
 * Visible, keyboard-reachable button that flips between light and dark
 * mode. A native `<button>` is focusable and activatable via keyboard
 * (Enter/Space) with no extra wiring; the `aria-label` communicates both
 * the current state and the action for screen reader users.
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
      className="shrink-0 rounded-md border border-zinc-300 dark:border-zinc-700 p-1.5 text-base leading-none text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-colors"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

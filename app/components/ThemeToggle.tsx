"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 left-6 z-10 rounded-md px-2 py-1 text-sm text-muted transition-colors hover:text-foreground"
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? "☀️" : "🌙"}
    </button>
  );
}

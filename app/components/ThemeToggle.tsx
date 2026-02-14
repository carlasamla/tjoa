"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="fixed top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-lg text-muted transition-colors hover:text-foreground active:bg-foreground/10 sm:top-4 sm:right-4"
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? "☀️" : "🌙"}
    </button>
  );
}

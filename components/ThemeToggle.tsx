"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="rounded-full p-2.5 shadow-lg backdrop-blur-xl transition hover:scale-105 bg-white/80 border border-white/30 dark:bg-gray-800/80 dark:border-white/10 text-gray-700 dark:text-gray-300"
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-full p-2 shadow-sm backdrop-blur-xl transition hover:scale-105 bg-white/80 border border-white/30 dark:bg-gray-800/80 dark:border-white/10 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

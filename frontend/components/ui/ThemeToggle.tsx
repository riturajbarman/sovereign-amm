"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder to avoid layout shift before hydration
    return <div className="w-10 h-10" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-transparent transition-colors duration-300 hover:bg-sky-200/50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 overflow-hidden"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 absolute transition-all duration-500 scale-100 rotate-0 dark:scale-0 dark:-rotate-90 text-slate-900 dark:text-slate-100" />
      <Moon className="h-5 w-5 absolute transition-all duration-500 scale-0 rotate-90 dark:scale-100 dark:rotate-0 text-slate-900 dark:text-slate-100" />
    </button>
  );
}

"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className="fixed bottom-5 right-5 z-50 w-11 h-11 border-2 border-black bg-white dark:bg-black dark:border-white shadow-neo hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex items-center justify-center"
    >
      {theme === "dark"
        ? <Sun  className="w-5 h-5 text-yellow-300" />
        : <Moon className="w-5 h-5 text-black" />}
    </button>
  );
}

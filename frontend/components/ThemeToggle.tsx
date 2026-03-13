"use client";

import { useTheme } from "./ThemeProvider";

const THEME_CYCLE = ["system", "light", "dark"] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleClick = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻";

  return (
    <button
      onClick={handleClick}
      aria-label="테마 변경"
      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
      title={`현재: ${theme === "dark" ? "다크" : theme === "light" ? "라이트" : "시스템"}`}
    >
      {icon}
    </button>
  );
}

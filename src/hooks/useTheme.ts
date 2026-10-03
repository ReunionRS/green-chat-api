import { useEffect, useState } from "react";

const THEME_KEY = "green-chat-theme";

export function useTheme() {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem(THEME_KEY) === "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  return { darkMode, toggleTheme: () => setDarkMode((value) => !value) };
}

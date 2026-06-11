"use client";

import { useLayoutEffect } from "react";

export default function ThemeRestorer() {
  useLayoutEffect(() => {
    let theme: string | null = null;
    try { theme = localStorage.getItem("theme"); } catch (_) {}
    if (!theme) {
      const match = document.cookie.match(/(?:^|;\s*)theme=([^;]+)/);
      theme = match ? match[1] : null;
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    }
  });

  return null;
}

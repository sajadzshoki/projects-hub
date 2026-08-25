"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";

const STORAGE_KEY = "theme";

function isLight(): boolean {
  return document.documentElement.classList.contains("light");
}

function applyTheme(light: boolean) {
  document.documentElement.classList.toggle("light", light);
  try {
    localStorage.setItem(STORAGE_KEY, light ? "light" : "dark");
  } catch {
    /* private mode / blocked storage */
  }
}

/** Icon button that flips between the default dark theme and light mode. */
export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(isLight());
  }, []);

  function toggle() {
    const next = !isLight();
    applyTheme(next);
    setLight(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      className={buttonClasses({ variant: "ghost", size: "icon-sm" })}
    >
      {light ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
    </button>
  );
}

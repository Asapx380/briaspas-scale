"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

const THEME_KEY = "briaspas.theme";

type Theme = "light" | "dark";

type ThemeToggleProps = Readonly<{
  className?: string;
}>;

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeTheme(onStoreChange: () => void) {
  queueMicrotask(onStoreChange);
  window.addEventListener("briaspas-theme-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("briaspas-theme-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "light");

  function toggleTheme() {
    const nextTheme: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // O tema ainda funciona quando o armazenamento do navegador está indisponível.
    }
    window.dispatchEvent(new Event("briaspas-theme-change"));
  }

  const nextLabel = theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className={`theme-toggle grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--text-2)] shadow-sm transition-[background-color,color,border-color,transform] hover:bg-[var(--neu-bg-pop)] hover:text-[var(--text)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${className}`}
    >
      <Sun className="theme-icon-light" size={19} weight="bold" aria-hidden />
      <Moon className="theme-icon-dark" size={19} weight="bold" aria-hidden />
    </button>
  );
}

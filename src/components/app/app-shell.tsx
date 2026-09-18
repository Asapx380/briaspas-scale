"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { List } from "@phosphor-icons/react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { NotificationBell } from "@/components/app/notification-bell";

const SIDEBAR_COLLAPSED_KEY = "briaspas.sidebar.collapsed";
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

type AppShellProps = {
  email: string | null;
  notificationCount?: number;
  children: React.ReactNode;
};

export function AppShell({ email, notificationCount = 0, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-[100dvh] bg-[var(--neu-bg)] text-[var(--text)]">
      <AppSidebar
        email={email}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/5 bg-[var(--neu-bg)]/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            className={`grid size-11 place-items-center rounded-full bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur ${FOCUS}`}
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu de navegação"
            title="Abrir navegação"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
          >
            <List size={20} weight="bold" aria-hidden />
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/brand/briaspas-scale-symbol.png?v=2"
              alt=""
              width={24}
              height={24}
              className="size-6 object-contain"
            />
            <span className="text-sm font-semibold text-[var(--text)]">Briaspas Scale</span>
          </div>
        </div>

        <div className="app-canvas relative min-h-0 flex-1">{children}</div>
      </div>

      <NotificationBell count={notificationCount} />
    </div>
  );
}

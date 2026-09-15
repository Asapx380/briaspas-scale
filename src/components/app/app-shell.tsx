"use client";

import { useState } from "react";
import { List } from "@phosphor-icons/react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { NotificationBell } from "@/components/app/notification-bell";

type AppShellProps = {
  email: string | null;
  notificationCount?: number;
  children: React.ReactNode;
};

export function AppShell({ email, notificationCount = 0, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] bg-[var(--neu-bg)] text-[var(--text)]">
      <AppSidebar email={email} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/5 bg-[var(--neu-bg)]/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full bg-white shadow-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <List size={20} weight="bold" />
          </button>
          <span className="text-sm font-semibold">Briaspas Scale</span>
        </div>

        <div className="app-canvas relative min-h-0 flex-1">{children}</div>
      </div>

      <NotificationBell count={notificationCount} />
    </div>
  );
}

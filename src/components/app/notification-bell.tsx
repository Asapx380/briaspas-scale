"use client";

import { useState } from "react";
import { Bell } from "@phosphor-icons/react";

type NotificationBellProps = {
  count?: number;
};

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-5 bottom-5 z-30 sm:right-8 sm:bottom-8">
      {open && (
        <div className="app-card absolute right-0 bottom-16 w-72 p-4 text-sm text-[var(--text)]">
          <p className="font-semibold">Notificações</p>
          {count > 0 ? (
            <p className="mt-2 text-[var(--text-3)]">
              Você tem {count} follow-up{count === 1 ? "" : "s"} atrasado{count === 1 ? "" : "s"} no CRM.
            </p>
          ) : (
            <p className="mt-2 text-[var(--text-3)]">Nenhuma notificação urgente no momento.</p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-12 place-items-center rounded-full bg-white text-[var(--text)] shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        aria-label="Notificações"
        aria-expanded={open}
      >
        <Bell size={20} weight="regular" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
    </div>
  );
}

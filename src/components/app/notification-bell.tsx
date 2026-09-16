"use client";

import { useEffect, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import Link from "next/link";

type NotificationItem = {
  id: number;
  kind: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  lead_id: number | null;
};

type NotificationBellProps = {
  count?: number;
};

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [fetchedUnread, setFetchedUnread] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/v1/notifications");
      if (!response.ok || cancelled) return;
      const payload = await response.json() as {
        data?: { items?: NotificationItem[]; unread?: number };
      };
      if (cancelled) return;
      setItems(payload.data?.items ?? []);
      setFetchedUnread(payload.data?.unread ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function markAllRead() {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setFetchedUnread(0);
  }

  const badge = fetchedUnread ?? count;

  return (
    <div className="fixed right-5 bottom-5 z-30 sm:right-8 sm:bottom-8">
      {open && (
        <div className="app-card absolute right-0 bottom-16 w-80 max-h-96 overflow-hidden p-0 text-sm text-[var(--text)]">
          <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
            <p className="font-semibold">Notificações</p>
            {badge > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-[var(--brand)] hover:underline">
                Marcar lidas
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto px-4 py-3">
            {items.length === 0 && count > 0 && (
              <p className="text-[var(--text-3)]">
                Você tem {count} follow-up{count === 1 ? "" : "s"} atrasado{count === 1 ? "" : "s"} no CRM.
              </p>
            )}
            {items.length === 0 && count === 0 && (
              <p className="text-[var(--text-3)]">Nenhuma notificação urgente no momento.</p>
            )}
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className={`rounded-lg border px-3 py-2 ${item.read_at ? "border-black/6 bg-white" : "border-[var(--brand)]/20 bg-[var(--brand-hover)]/8"}`}>
                  <p className="font-semibold text-[var(--text)]">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-3)]">{item.body}</p>
                  {item.lead_id && (
                    <Link href="/app/crm" className="mt-2 inline-block text-xs font-semibold text-[var(--brand)]">
                      Abrir CRM
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {count > 0 && items.length > 0 && (
              <p className="mt-3 border-t border-black/8 pt-3 text-xs text-[var(--text-3)]">
                Inclui follow-ups atrasados no funil quando aplicável.
              </p>
            )}
          </div>
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
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
    </div>
  );
}

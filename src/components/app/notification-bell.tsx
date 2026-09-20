"use client";

import { useCallback, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import Link from "next/link";
import { SkeletonBar, Spinner } from "@/components/ui/async-feedback";

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30", page: String(nextPage) });
      const response = await fetch(`/api/v1/notifications?${params}`);
      if (!response.ok) throw new Error("Não foi possível carregar as notificações.");
      const payload = (await response.json()) as {
        data?: {
          items?: NotificationItem[];
          unread?: number;
          hasMore?: boolean;
          page?: number;
        };
      };
      const pageItems = payload.data?.items ?? [];
      setItems((current) => (append ? [...current, ...pageItems] : pageItems));
      if (!append) setFetchedUnread(payload.data?.unread ?? 0);
      setPage(payload.data?.page ?? nextPage);
      setHasMore(Boolean(payload.data?.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar notificações.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function markAllRead() {
    if (marking) return;
    setMarking(true);
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setItems((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
      );
      setFetchedUnread(0);
    } finally {
      setMarking(false);
    }
  }

  function toggleOpen() {
    setOpen((value) => {
      const next = !value;
      if (next) void loadPage(1, false);
      return next;
    });
  }

  const badge = fetchedUnread ?? count;

  return (
    <div className="fixed right-5 bottom-5 z-30 sm:right-8 sm:bottom-8">
      {open && (
        <div
          className="app-card absolute right-0 bottom-16 w-80 max-h-96 overflow-hidden p-0 text-sm text-[var(--text)]"
          role="dialog"
          aria-label="Painel de notificações"
          aria-busy={loading || marking}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="font-semibold">Notificações</p>
            {badge > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking || loading}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline disabled:opacity-60"
              >
                {marking && <Spinner className="size-3" />}
                {marking ? "Marcando…" : "Marcar lidas"}
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto px-4 py-3">
            {loading && items.length === 0 && (
              <div className="space-y-3" aria-label="Carregando notificações">
                <SkeletonBar className="h-12 w-full rounded-lg" />
                <SkeletonBar className="h-12 w-full rounded-lg" />
                <SkeletonBar className="h-12 w-full rounded-lg" />
              </div>
            )}
            {error && (
              <div role="alert" className="space-y-2">
                <p className="text-rose-600">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadPage(1, false)}
                  className="text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  Tentar de novo
                </button>
              </div>
            )}
            {!loading && !error && items.length === 0 && count > 0 && (
              <p className="text-[var(--text-3)]">
                Você tem {count} follow-up{count === 1 ? "" : "s"} atrasado
                {count === 1 ? "" : "s"} no CRM.
              </p>
            )}
            {!loading && !error && items.length === 0 && count === 0 && (
              <p className="text-[var(--text-3)]">Nenhuma notificação urgente no momento.</p>
            )}
            {items.length > 0 && (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-lg border px-3 py-2 ${
                      item.read_at
                        ? "border-[var(--border)] bg-[var(--card)]"
                        : "border-[var(--brand)]/20 bg-[var(--brand-hover)]/8"
                    }`}
                  >
                    <p className="font-semibold text-[var(--text)]">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-3)]">{item.body}</p>
                    {item.lead_id && (
                      <Link
                        href={`/app/crm/${item.lead_id}`}
                        className="mt-2 inline-block text-xs font-semibold text-[var(--brand)]"
                      >
                        Ver lead no CRM
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {hasMore && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadPage(page + 1, true)}
                className="mt-3 w-full rounded-lg border border-[var(--border)] py-2 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--neu-bg-pop)] disabled:opacity-50"
              >
                {loading ? "Carregando…" : "Carregar mais"}
              </button>
            )}
            {count > 0 && items.length > 0 && (
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-3)]">
                Inclui follow-ups atrasados no funil quando aplicável.
              </p>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={toggleOpen}
        className="relative grid size-12 place-items-center rounded-full bg-[var(--card)] text-[var(--text)] shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        aria-label={
          badge > 0
            ? `Notificações, ${badge} não lida${badge === 1 ? "" : "s"}`
            : "Notificações, nenhuma não lida"
        }
        title="Abrir notificações"
        aria-expanded={open}
      >
        <Bell size={20} weight="regular" aria-hidden />
        {badge > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-[var(--brand-solid)] px-1 text-[10px] font-bold text-white"
            aria-hidden
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Buildings,
  CalendarBlank,
  ChartLineUp,
  CurrencyDollar,
  GearSix,
  Kanban,
  Layout,
  ListChecks,
  PlusCircle,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { logout } from "@/app/app/actions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof ChartLineUp;
  match?: "exact" | "prefix";
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: ChartLineUp, match: "exact" },
  { href: "/app/leads", label: "Adicionar leads", icon: PlusCircle, match: "prefix" },
  { href: "/app/crm", label: "CRM", icon: Kanban, match: "prefix" },
  { href: "/app/agendamentos", label: "Agendamentos", icon: CalendarBlank, match: "prefix" },
  { href: "/app/equipe", label: "Equipe", icon: UsersThree, match: "prefix" },
  { href: "/app/projetos", label: "Projetos", icon: ListChecks, match: "prefix" },
  { href: "/app/operacao", label: "Operação", icon: Buildings, match: "prefix" },
  {
    href: "/app/configuracoes/integracoes",
    label: "Integrações",
    icon: GearSix,
    match: "prefix",
  },
  { href: "#", label: "Cobrar clientes", icon: CurrencyDollar, badge: "EM BREVE" },
  { href: "#", label: "Templates", icon: Layout, badge: "EM BREVE" },
];
function isActive(pathname: string, item: NavItem) {
  if (item.href === "#") return false;
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type AppSidebarProps = {
  email: string | null;
  open: boolean;
  onClose: () => void;
};

export function AppSidebar({ email, open, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Barra lateral" aria-modal={open} role="dialog"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-6 pb-4">
          <Link href="/app" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="grid size-9 place-items-center rounded-xl bg-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
              <Image
                src="/brand/briaspas-scale-symbol.png"
                alt=""
                width={256}
                height={256}
                className="size-7"
                priority
              />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-[var(--shell-text)]">
              Briaspas Scale
            </span>
          </Link>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-[var(--shell-soft)] hover:bg-white/8 md:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            const disabled = Boolean(item.badge);

            const className = `flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150 ${
              active
                ? "bg-[var(--brand)] text-white shadow-[0_8px_20px_rgba(0,113,227,0.32)]"
                : disabled
                  ? "cursor-default text-[var(--shell-muted)]/70"
                  : "text-[var(--shell-muted)] hover:bg-white/[0.06] hover:text-[var(--shell-text)]"
            }`;

            const content = (
              <>
                <Icon size={18} weight={active ? "fill" : "regular"} className="shrink-0" />
                <span className="flex-1 truncate text-left">{item.label}</span>
                {item.badge && (
                  <span className="rounded-md bg-[#ff9f0a]/18 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#ffd60a]">
                    {item.badge}
                  </span>
                )}
              </>
            );

            if (disabled) {
              return (
                <span key={item.label} className={className} aria-disabled="true">
                  {content}
                </span>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={className} onClick={onClose}>
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-[var(--shell-edge)] px-4 py-4">
          <Link
            href="/app/configuracoes/integracoes"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-full bg-[var(--brand)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(0,113,227,0.32)] transition-opacity hover:opacity-90"
          >
            Ver planos
          </Link>

          <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-[var(--shell-muted)]">
            <span className="font-medium text-[var(--shell-soft)]">Português</span>
            <span aria-hidden="true">|</span>
            <span>Em breve</span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-[var(--shell-well)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="grid size-8 place-items-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">
              {(email?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--shell-soft)]">{email ?? "Conta"}</p>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-[11px] text-[var(--shell-muted)] transition-colors hover:text-[var(--shell-text)]"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

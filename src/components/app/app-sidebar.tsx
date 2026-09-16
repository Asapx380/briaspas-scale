"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowCircleUp,
  Buildings,
  CalendarBlank,
  ChartLineUp,
  CurrencyDollar,
  GearSix,
  Kanban,
  Layout,
  ListChecks,
  Moon,
  PlusCircle,
  SidebarSimple,
  Translate,
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
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AppSidebar({
  email,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: AppSidebarProps) {
  const pathname = usePathname();
  const initial = (email?.[0] ?? "U").toUpperCase();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`app-sidebar glass-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:translate-x-0 ${
          collapsed ? "md:w-[72px]" : "w-[260px]"
        } ${open ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px]"}`}
        aria-label="Barra lateral"
        aria-modal={open}
        role="dialog"
        data-collapsed={collapsed ? "true" : "false"}
      >
        <div
          className={`flex items-center gap-2 pt-5 pb-3 ${
            collapsed
              ? "justify-between px-4 md:flex-col md:justify-center md:gap-2 md:px-2"
              : "justify-between px-4"
          }`}
        >
          <Link
            href="/app"
            className={`flex min-w-0 items-center gap-2.5 ${collapsed ? "md:justify-center" : ""}`}
            onClick={onClose}
          >
            <Image
              src="/brand/briaspas-scale-symbol.png"
              alt="Briaspas Scale"
              width={128}
              height={128}
              className="size-8 shrink-0 object-contain"
              priority
            />
            <span
              className={`truncate text-[15px] font-semibold tracking-tight text-[var(--shell-text)] ${
                collapsed ? "md:hidden" : ""
              }`}
            >
              Briaspas Scale
            </span>
          </Link>

          <div className={`flex items-center gap-1 ${collapsed ? "md:w-full md:justify-center" : ""}`}>
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/[0.04] text-[var(--shell-muted)] transition-colors hover:bg-black/[0.07] hover:text-[var(--shell-text)] max-md:hidden"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              aria-pressed={collapsed}
            >
              <SidebarSimple size={16} weight="bold" className={collapsed ? "rotate-180" : ""} />
            </button>

            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-[var(--shell-muted)] hover:bg-black/[0.06] md:hidden"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        <nav
          className={`flex-1 space-y-0.5 overflow-y-auto pb-4 ${collapsed ? "md:px-2" : "px-3"}`}
          aria-label="Navegação principal"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            const disabled = Boolean(item.badge);

            const className = `group flex w-full items-center gap-3 rounded-full text-[13px] font-medium transition-all duration-150 ${
              collapsed ? "md:justify-center md:px-0 md:py-2.5" : "px-3.5 py-2.5"
            } ${
              active
                ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] shadow-[0_6px_16px_rgba(0,113,227,0.28)]"
                : disabled
                  ? "cursor-default text-[var(--shell-muted)]"
                  : "text-[var(--shell-muted)] hover:bg-black/[0.04] hover:text-[var(--shell-text)]"
            }`;

            const content = (
              <>
                <Icon
                  size={18}
                  weight={active ? "fill" : "regular"}
                  className="shrink-0"
                  aria-hidden
                />
                <span className={`flex-1 truncate text-left ${collapsed ? "md:hidden" : ""}`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    className={`rounded-full bg-white px-2 py-0.5 text-[9px] font-bold tracking-wide text-[#ff9500] shadow-[0_2px_8px_rgba(15,23,42,0.1)] ${
                      collapsed ? "md:hidden" : ""
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            );

            if (disabled) {
              return (
                <span
                  key={item.label}
                  className={className}
                  aria-disabled="true"
                  title={collapsed ? `${item.label} — ${item.badge}` : undefined}
                >
                  {content}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={className}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <div
          className={`mt-auto space-y-3 border-t border-[var(--shell-edge)] py-4 ${
            collapsed ? "md:px-2" : "px-4"
          }`}
        >
          <Link
            href="/app/configuracoes/integracoes"
            onClick={onClose}
            className={`flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand)] py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(0,113,227,0.28)] transition-opacity hover:opacity-90 ${
              collapsed ? "md:px-0" : "px-4"
            }`}
            title="Fazer upgrade"
          >
            <ArrowCircleUp size={18} weight="fill" className="shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>Fazer upgrade</span>
          </Link>

          <div
            className={`flex items-center gap-2 px-1 text-[11px] text-[var(--shell-muted)] ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            <Translate size={14} className="shrink-0 text-[var(--shell-soft)]" aria-hidden />
            <span className="font-medium text-[var(--shell-text)]">Português</span>
            <span aria-hidden="true" className="text-[var(--text-5)]">
              ·
            </span>
            <span className="text-[var(--text-4)]">English</span>
          </div>

          <div
            className={`flex items-center ${
              collapsed ? "md:flex-col md:gap-2" : "justify-between gap-2 px-0.5"
            }`}
          >
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-[var(--shell-muted)] transition-colors hover:bg-black/[0.05] hover:text-[var(--shell-text)]"
              aria-label="Tema escuro (em breve)"
              title="Tema escuro — em breve"
            >
              <Moon size={18} weight="regular" />
            </button>

            <Link
              href="/app/configuracoes/integracoes"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full text-[var(--shell-muted)] transition-colors hover:bg-black/[0.05] hover:text-[var(--shell-text)]"
              aria-label="Configurações"
              title="Configurações"
            >
              <GearSix size={18} weight="regular" />
            </Link>

            <div className="group relative">
              <div
                className="grid size-9 place-items-center rounded-full bg-[var(--brand)] text-xs font-bold text-white shadow-sm"
                title={email ?? "Conta"}
                aria-label={email ? `Conta ${email}` : "Conta"}
              >
                {initial}
              </div>
              <form
                action={logout}
                className={`absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${
                  collapsed ? "md:left-full md:bottom-1/2 md:mb-0 md:ml-2 md:translate-x-0 md:translate-y-1/2" : ""
                }`}
              >
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--text-2)] shadow-[0_4px_16px_rgba(15,23,42,0.12)] ring-1 ring-black/6 hover:text-[var(--text)]"
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

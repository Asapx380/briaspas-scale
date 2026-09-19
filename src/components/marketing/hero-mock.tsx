import { Tooth } from "@phosphor-icons/react/dist/ssr";
import { HeroLeadCard } from "@/components/marketing/hero-lead-card";

export function HeroMock() {
  return (
    <div className="w-full min-w-0 overflow-hidden" aria-hidden="true">
      <div className="overflow-hidden rounded-[22px] border border-black/[0.08] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[var(--neu-bg-pop)] px-3 py-2.5">
          <span className="size-2.5 shrink-0 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 shrink-0 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 shrink-0 rounded-full bg-[#28c840]" />
          <div className="ml-1 min-w-0 flex-1 truncate rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-medium text-[var(--text-3)] sm:text-[11px]">
            briaspas-scale.vercel.app/empresa/clinica-sorriso
          </div>
        </div>

        <div className="relative bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-3 sm:p-4">
          <div className="rounded-2xl border border-black/[0.05] bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--brand-tint)] text-[var(--brand)]">
                  <Tooth size={18} weight="duotone" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[var(--text)] sm:text-sm">Clínica Sorriso</p>
                  <p className="truncate text-[10px] text-[var(--text-3)] sm:text-[11px]">Odontologia em Campinas</p>
                </div>
              </div>
              <span className="hidden rounded-full bg-[var(--brand-tint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)] sm:inline">
                Agendar
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-[var(--neu-bg)] p-2.5">
                <p className="text-[10px] font-semibold text-[var(--text-3)]">Limpeza</p>
                <p className="mt-1 text-[11px] font-bold text-[var(--text)]">A partir de R$ 189</p>
              </div>
              <div className="rounded-xl bg-[var(--neu-bg)] p-2.5">
                <p className="text-[10px] font-semibold text-[var(--text-3)]">Clareamento</p>
                <p className="mt-1 text-[11px] font-bold text-[var(--text)]">Sessão guiada</p>
              </div>
              <div className="col-span-1 rounded-xl bg-[var(--brand-tint)] p-2.5 sm:col-span-1">
                <p className="text-[10px] font-semibold text-[var(--brand)]">Contato</p>
                <p className="mt-1 text-[11px] font-bold text-[var(--text)]">WhatsApp</p>
              </div>
            </div>
          </div>

          <HeroLeadCard />
        </div>
      </div>
    </div>
  );
}

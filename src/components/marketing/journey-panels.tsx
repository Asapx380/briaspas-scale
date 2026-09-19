import {
  Buildings,
  Copy,
  Link as LinkIcon,
  MagnifyingGlass,
  MapPin,
  Tooth,
} from "@phosphor-icons/react/dist/ssr";
import { JourneyKanbanLive } from "@/components/marketing/journey-kanban-live";

const demoCompanies = [
  { name: "Auto Mecânica Norte", niche: "Mecânica", city: "Campinas" },
  { name: "Sabor da Roça", niche: "Restaurante", city: "Campinas" },
  { name: "Clínica Sorriso", niche: "Odontologia", city: "Campinas" },
];

function DemoLabel() {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
      Dados demonstrativos
    </p>
  );
}

export function JourneyPanelEncontre() {
  return (
    <div className="journey-panel-card rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <DemoLabel />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-[var(--text-3)]">Nicho</span>
          <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--neu-bg)] px-3 py-2.5 text-sm text-[var(--text-2)]">
            <MagnifyingGlass size={16} className="shrink-0 text-[var(--text-3)]" aria-hidden="true" />
            Odontologia
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-[var(--text-3)]">Cidade</span>
          <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--neu-bg)] px-3 py-2.5 text-sm text-[var(--text-2)]">
            <MapPin size={16} className="shrink-0 text-[var(--text-3)]" aria-hidden="true" />
            Campinas, SP
          </span>
        </label>
      </div>
      <ul className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
        {demoCompanies.map((company) => (
          <li key={company.name} className="flex items-center gap-3 px-3 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-tint)] text-[var(--brand)]">
              <Buildings size={18} weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{company.name}</p>
              <p className="truncate text-xs text-[var(--text-3)]">{company.niche} · {company.city}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-[var(--text-3)]">
        Exemplo ilustrativo. Na conta, você busca ou importa empresas reais do seu mercado.
      </p>
    </div>
  );
}

export function JourneyPanelApresente() {
  return (
    <div className="journey-panel-card overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--neu-bg-pop)] px-4 py-3">
        <DemoLabel />
        <span
          className="marketing-button inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
        >
          <Copy size={14} weight="bold" aria-hidden="true" />
          Copiar link
        </span>
      </div>
      <div className="bg-[image:var(--preview-canvas-bg)] p-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--brand-tint)] text-[var(--brand)]">
              <Tooth size={18} weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--text)]">Clínica Sorriso</p>
              <p className="truncate text-[11px] text-[var(--text-3)]">Odontologia em Campinas</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--neu-bg)] px-2.5 py-2 text-[11px] text-[var(--text-3)]">
            <LinkIcon size={14} className="shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <span className="truncate">briaspas-scale.vercel.app/empresa/clinica-sorriso</span>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-3)]">
          Você revisa o conteúdo antes de publicar e enviar o link ao contato.
        </p>
      </div>
    </div>
  );
}

export function JourneyPanelPriorize() {
  return (
    <div className="journey-panel-card rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <DemoLabel />
      <JourneyKanbanLive />
      <p className="mt-3 text-xs leading-5 text-[var(--text-3)]">
        Organize retornos no CRM. Visitas ao link ajudam a priorizar, quando disponíveis.
      </p>
    </div>
  );
}

export const journeyPanels = [
  { id: "encontre", Panel: JourneyPanelEncontre },
  { id: "apresente", Panel: JourneyPanelApresente },
  { id: "priorize", Panel: JourneyPanelPriorize },
] as const;

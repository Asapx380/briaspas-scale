"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Buildings,
  CaretDown,
  LockSimple,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { CreateLeadModal } from "@/components/crm/create-lead-modal";
import { KanbanCard } from "@/components/crm/kanban-card";
import { WhatsAppChatModal, WhatsAppControlPanel } from "@/components/crm/whatsapp-chat";
import {
  FILTER_CHIPS,
  PIPELINE_COLUMNS,
  SORT_OPTIONS,
  columnForStatus,
  matchesFilter,
  matchesSearch,
  sortLeads,
} from "@/lib/crm/pipeline";
import type { CrmFilterId, CrmLead, CrmSortId, LeadPatch, LeadStatus, PipelineColumnId } from "@/lib/crm/types";

type WhatsAppConversationSummary = {
  id: number;
  contact_name: string | null;
  contact_phone: string | null;
  agent_enabled: boolean;
  last_message_at: string | null;
  lead_id: number | null;
};

function ColumnDropZone({
  columnId,
  children,
}: {
  columnId: PipelineColumnId;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] space-y-2.5 rounded-2xl p-1 transition-colors ${
        isOver ? "bg-[var(--brand-tint)]/60" : ""
      }`}
    >
      {children}
    </div>
  );
}

async function patchLeadStatus(lead: CrmLead, status: LeadStatus) {
  const response = await fetch(`/api/v1/leads/${lead.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const payload = (await response.json()) as {
    lead?: Partial<CrmLead>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Não foi possível atualizar o status.");
  }
  return payload.lead;
}

export function CrmBoard({
  initialLeads,
  loadError,
  whatsappConversations = [],
  demoMode = false,
}: {
  initialLeads: CrmLead[];
  loadError: string | null;
  whatsappConversations?: WhatsAppConversationSummary[];
  demoMode?: boolean;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CrmFilterId>("all");
  const [sort, setSort] = useState<CrmSortId>("recent");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [chatLead, setChatLead] = useState<CrmLead | null>(null);
  const [baseline, setBaseline] = useState(initialLeads);

  if (initialLeads !== baseline) {
    setBaseline(initialLeads);
    setLeads(initialLeads);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filtered = useMemo(() => {
    const list = leads.filter(
      (lead) => matchesSearch(lead, query) && matchesFilter(lead, filter),
    );
    return sortLeads(list, sort);
  }, [leads, query, filter, sort]);

  const activeLead = activeId == null ? null : leads.find((lead) => lead.id === activeId) ?? null;

  function updateLead(updated: LeadPatch) {
    setLeads((current) =>
      current.map((lead) => (lead.id === updated.id ? { ...lead, ...updated } : lead)),
    );
  }

  async function moveLead(leadId: number, columnId: PipelineColumnId) {
    const lead = leads.find((item) => item.id === leadId);
    const column = PIPELINE_COLUMNS.find((item) => item.id === columnId);
    if (!lead || !column) return;
    if (column.statuses.includes(lead.status)) return;

    const previous = lead.status;
    updateLead({ id: lead.id, status: column.dropStatus });
    setPersistError(null);

    if (demoMode) return;

    try {
      await patchLeadStatus(lead, column.dropStatus);
    } catch (error) {
      updateLead({ id: lead.id, status: previous });
      setPersistError(error instanceof Error ? error.message : "Falha ao salvar o status.");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = Number(String(active.id).replace("lead-", ""));
    if (!Number.isFinite(leadId)) return;

    const overId = String(over.id);
    const column =
      PIPELINE_COLUMNS.find((item) => item.id === overId) ??
      (() => {
        const overLeadId = Number(overId.replace("lead-", ""));
        const overLead = leads.find((item) => item.id === overLeadId);
        return overLead ? columnForStatus(overLead.status) : null;
      })();

    if (!column) return;
    void moveLead(leadId, column.id);
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-[2rem]">CRM</h1>
          <p className="mt-1.5 text-sm text-[var(--text-3)] sm:text-[15px]">
            Filtre, priorize e gerencie o contato com cada lead
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-hover)]"
          >
            <Plus size={16} weight="bold" /> Criar lead
          </button>
          <button
            type="button"
            disabled
            title="Disponível no plano superior"
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/8 bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--text-4)]"
          >
            <LockSimple size={15} weight="fill" /> Exportar
          </button>
          <label className="relative inline-flex items-center">
            <span className="sr-only">Ordenar</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as CrmSortId)}
              className="appearance-none rounded-xl border border-black/8 bg-white py-2.5 pr-9 pl-3.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  Ordenar: {option.label}
                </option>
              ))}
            </select>
            <CaretDown size={14} className="pointer-events-none absolute right-3 text-[var(--text-4)]" />
          </label>
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-3">
        <label className="relative block max-w-xl">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--text-4)]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, categoria, cidade ou telefone..."
            className="w-full rounded-2xl border border-black/8 bg-white py-2.5 pr-4 pl-11 text-sm text-[var(--text)] placeholder:text-[var(--text-4)] shadow-sm focus:border-[var(--brand)]/35 focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.18)]"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros">
          {FILTER_CHIPS.map((chip) => {
            const active = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "border border-black/8 bg-white text-[var(--text-3)] hover:bg-[var(--neu-bg-pop)]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {!demoMode && <WhatsAppControlPanel conversations={whatsappConversations} />}

      {loadError && (
        <p role="alert" className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </p>
      )}
      {persistError && (
        <p role="alert" className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-700">
          {persistError}
        </p>
      )}

      {!loadError && leads.length === 0 && (
        <section className="mt-14 flex max-w-xl items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--brand)]/20 bg-[var(--brand-hover)]/10 text-[var(--brand)]">
            <Buildings size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text)]">Seu CRM está pronto</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-3)]">
              Busque empresas ou cadastre uma manualmente. Os leads aparecerão aqui automaticamente.
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-white"
            >
              <Plus size={15} weight="bold" /> Criar lead
            </button>
          </div>
        </section>
      )}

      {!loadError && leads.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event) => {
            const id = Number(String(event.active.id).replace("lead-", ""));
            setActiveId(Number.isFinite(id) ? id : null);
          }}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={onDragEnd}
        >
          <section
            className="mt-6 flex gap-3 overflow-x-auto pb-4"
            aria-label="Quadro Kanban do CRM"
          >
            {PIPELINE_COLUMNS.map((column) => {
              const columnLeads = filtered.filter((lead) => column.statuses.includes(lead.status));
              return (
                <div
                  key={column.id}
                  className="flex w-[260px] shrink-0 flex-col rounded-[20px] bg-[var(--neu-bg-well)]/80 p-2.5 sm:w-[272px]"
                >
                  <div className="flex items-center gap-2 px-2 py-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: column.color }}
                      aria-hidden
                    />
                    <h2 className="text-sm font-semibold text-[var(--text)]">{column.title}</h2>
                    <span className="ml-auto text-xs font-semibold tabular-nums text-[var(--text-4)]">
                      {columnLeads.length}
                    </span>
                  </div>
                  <ColumnDropZone columnId={column.id}>
                    {columnLeads.map((lead) => (
                      <KanbanCard
                        key={lead.id}
                        lead={lead}
                        onWhatsAppChat={(item) => setChatLead(item)}
                      />
                    ))}
                    {columnLeads.length === 0 && (
                      <p className="px-2 py-10 text-center text-sm text-[var(--text-5)]">Sem leads</p>
                    )}
                  </ColumnDropZone>
                </div>
              );
            })}
          </section>

          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <div className="w-[256px] scale-[1.02] opacity-95 shadow-xl">
                <KanbanCard lead={activeLead} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(lead) => setLeads((current) => [lead, ...current])}
      />

      {chatLead && (
        <WhatsAppChatModal
          leadId={chatLead.id}
          companyName={chatLead.company_name}
          phone={chatLead.phone}
          open
          onClose={() => setChatLead(null)}
        />
      )}
    </main>
  );
}

// Re-export types used by the CRM page
export type { CrmLead, LeadStatus } from "@/lib/crm/types";

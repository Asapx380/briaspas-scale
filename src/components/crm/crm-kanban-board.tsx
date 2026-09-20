"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { memo, useCallback, useMemo, useState } from "react";
import { KanbanCard } from "@/components/crm/kanban-card";
import { PIPELINE_COLUMNS, columnForStatus } from "@/lib/crm/pipeline";
import type { CrmLead, PipelineColumnId } from "@/lib/crm/types";

const ColumnDropZone = memo(function ColumnDropZone({
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
      className={`min-h-[120px] space-y-2.5 rounded-2xl p-1 transition-[background-color,box-shadow] duration-150 ${
        isOver ? "bg-[var(--brand-tint)]/60 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--brand)_35%,transparent)]" : ""
      }`}
    >
      {children}
    </div>
  );
});

type KanbanColumnProps = {
  columnId: PipelineColumnId;
  title: string;
  color: string;
  leads: CrmLead[];
  detailHrefPrefix?: string;
  onWhatsAppChat?: (lead: CrmLead) => void;
  pendingIds?: Set<number>;
};

const KanbanColumn = memo(function KanbanColumn({
  columnId,
  title,
  color,
  leads,
  detailHrefPrefix,
  onWhatsAppChat,
  pendingIds,
}: KanbanColumnProps) {
  return (
    <div className="flex w-[260px] shrink-0 flex-col rounded-[20px] bg-[var(--neu-bg-well)]/80 p-2.5 sm:w-[272px]">
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        <span className="ml-auto text-xs font-semibold tabular-nums text-[var(--text-4)]">
          {leads.length}
        </span>
      </div>
      <ColumnDropZone columnId={columnId}>
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            detailHref={detailHrefPrefix ? `${detailHrefPrefix}/${lead.id}` : undefined}
            onWhatsAppChat={onWhatsAppChat}
            syncing={pendingIds?.has(lead.id) ?? false}
          />
        ))}
        {leads.length === 0 && (
          <p className="px-2 py-10 text-center text-sm text-[var(--text-5)]">Sem leads</p>
        )}
      </ColumnDropZone>
    </div>
  );
});

function groupLeadsByColumn(leads: CrmLead[]) {
  const grouped = Object.fromEntries(
    PIPELINE_COLUMNS.map((column) => [column.id, [] as CrmLead[]]),
  ) as Record<PipelineColumnId, CrmLead[]>;

  for (const lead of leads) {
    const column = columnForStatus(lead.status);
    grouped[column.id].push(lead);
  }

  return grouped;
}

export type CrmKanbanBoardProps = {
  leads: CrmLead[];
  demoMode?: boolean;
  onMoveLead: (leadId: number, columnId: PipelineColumnId) => void;
  onWhatsAppChat?: (lead: CrmLead) => void;
  pendingIds?: Set<number>;
};

export function CrmKanbanBoard({
  leads,
  demoMode = false,
  onMoveLead,
  onWhatsAppChat,
  pendingIds,
}: CrmKanbanBoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const leadsByColumn = useMemo(() => groupLeadsByColumn(leads), [leads]);
  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);
  const activeLead = activeId == null ? null : (leadsById.get(activeId) ?? null);
  const detailHrefPrefix = demoMode ? "/preview/crm" : undefined;

  const onDragStart = useCallback((event: DragStartEvent) => {
    const id = Number(String(event.active.id).replace("lead-", ""));
    setActiveId(Number.isFinite(id) ? id : null);
  }, []);

  const clearActive = useCallback(() => setActiveId(null), []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const leadId = Number(String(active.id).replace("lead-", ""));
      if (!Number.isFinite(leadId)) return;
      if (pendingIds?.has(leadId)) return;

      const overId = String(over.id);
      const column =
        PIPELINE_COLUMNS.find((item) => item.id === overId) ??
        (() => {
          const overLeadId = Number(overId.replace("lead-", ""));
          const overLead = leadsById.get(overLeadId);
          return overLead ? columnForStatus(overLead.status) : null;
        })();

      if (!column) return;
      onMoveLead(leadId, column.id);
    },
    [leadsById, onMoveLead, pendingIds],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragCancel={clearActive}
      onDragEnd={onDragEnd}
    >
      <section className="mt-6 flex gap-3 overflow-x-auto pb-4" aria-label="Quadro Kanban do CRM">
        {PIPELINE_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            columnId={column.id}
            title={column.title}
            color={column.color}
            leads={leadsByColumn[column.id]}
            detailHrefPrefix={detailHrefPrefix}
            onWhatsAppChat={onWhatsAppChat}
            pendingIds={pendingIds}
          />
        ))}
      </section>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
        {activeLead ? (
          <div className="pointer-events-none w-[256px] scale-[1.02] opacity-95 shadow-xl">
            <KanbanCard
              lead={activeLead}
              detailHref={detailHrefPrefix ? `${detailHrefPrefix}/${activeLead.id}` : undefined}
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

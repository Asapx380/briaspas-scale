"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChatCircleDots } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import { DotsSixVertical } from "@phosphor-icons/react/dist/csr/DotsSixVertical";
import { Phone } from "@phosphor-icons/react/dist/csr/Phone";
import { useRouter } from "next/navigation";
import { memo, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { leadScore, leadTier, tierLabel, toBrazilianWhatsAppNumber } from "@/lib/crm/pipeline";
import type { CrmLead } from "@/lib/crm/types";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

type KanbanCardProps = {
  lead: CrmLead;
  detailHref?: string;
  onWhatsAppChat?: (lead: CrmLead) => void;
  /** Static clone for DragOverlay — skips drag listeners. */
  overlay?: boolean;
  /** Persisting status after optimistic move. */
  syncing?: boolean;
};

function leadVisualKey(lead: CrmLead) {
  return [
    lead.id,
    lead.company_name,
    lead.status,
    lead.phone,
    lead.niche,
    lead.city,
    lead.rating,
    lead.review_count,
    lead.website_url,
    lead.site_status,
    lead.email,
    lead.google_maps_url,
  ].join("|");
}

function KanbanCardInner({ lead, detailHref, onWhatsAppChat, overlay = false, syncing = false }: KanbanCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { leadId: lead.id, status: lead.status },
    disabled: overlay || syncing,
  });

  const score = leadScore(lead);
  const tier = leadTier(score);
  const whatsapp = toBrazilianWhatsAppNumber(lead.phone);
  const meta = [lead.niche, lead.city].filter(Boolean).join(" · ");
  const href = detailHref ?? `/app/crm/${lead.id}`;

  const style: CSSProperties | undefined = overlay
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : syncing ? 0.7 : 1,
        zIndex: isDragging ? 20 : undefined,
      };

  function openDetail() {
    if (overlay || isDragging) return;
    router.push(href);
  }

  function onOpenKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  }

  function stopDrag(event: MouseEvent) {
    event.stopPropagation();
  }

  function onWhatsApp() {
    if (onWhatsAppChat) onWhatsAppChat(lead);
    else if (whatsapp) window.open(`https://wa.me/${whatsapp}`, "_blank", "noopener,noreferrer");
  }

  const face = (
    <>
      <div className="flex items-start gap-2">
        {!overlay && (
          <button
            type="button"
            className={`mt-0.5 grid size-8 shrink-0 cursor-grab place-items-center rounded-lg text-[var(--text-4)] hover:bg-[var(--neu-bg-well)] hover:text-[var(--text-2)] active:cursor-grabbing ${FOCUS}`}
            aria-label={`Arrastar ${lead.company_name} no funil`}
            title="Arrastar para outra etapa"
            {...listeners}
            {...attributes}
          >
            <DotsSixVertical size={16} weight="bold" aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex min-w-8 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums text-white ${
                score >= 45 ? "bg-[var(--success)]" : "bg-[var(--text-4)]"
              }`}
            >
              {score}
            </span>
            {(tier === "quente" || tier === "morno") && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  tier === "quente"
                    ? "bg-[color-mix(in_oklab,var(--success)_18%,white)] text-[var(--success-ink)]"
                    : "marketing-chip-hot"
                }`}
              >
                {tierLabel(tier)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={overlay ? undefined : openDetail}
            onKeyDown={overlay ? undefined : onOpenKeyDown}
            className={`mt-2.5 block w-full truncate text-left text-[15px] font-semibold tracking-tight text-[var(--text)] hover:text-[var(--brand)] ${FOCUS} rounded-md`}
            aria-label={`Abrir detalhes de ${lead.company_name}`}
            title="Abrir detalhes"
          >
            {lead.company_name}
          </button>
          {meta && <p className="mt-0.5 truncate text-xs text-[var(--text-4)]">{meta}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {lead.phone ? (
          <a
            href={`tel:${lead.phone.replace(/\D/g, "")}`}
            onClick={overlay ? undefined : stopDrag}
            onPointerDown={overlay ? undefined : stopDrag}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-2 py-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)] ${FOCUS}`}
            aria-label={`Ligar para ${lead.company_name}`}
            title="Ligar"
          >
            <Phone size={14} aria-hidden /> Ligar
          </a>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-2 py-2 text-xs text-[var(--text-4)]">
            Sem tel.
          </span>
        )}
        {whatsapp ? (
          <button
            type="button"
            onClick={
              overlay
                ? undefined
                : (event) => {
                    stopDrag(event);
                    onWhatsApp();
                  }
            }
            onPointerDown={overlay ? undefined : stopDrag}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-2 py-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)] ${FOCUS}`}
            aria-label={`Abrir chat WhatsApp de ${lead.company_name}`}
            title="Abrir conversa WhatsApp"
          >
            <ChatCircleDots size={14} aria-hidden /> WhatsApp
          </button>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-2 py-2 text-xs text-[var(--text-4)]">
            Sem WA
          </span>
        )}
      </div>
    </>
  );

  if (overlay) {
    return (
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        {face}
      </article>
    );
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      aria-busy={syncing}
      aria-label={`${lead.company_name}, score ${score}${syncing ? ", salvando status" : ""}`}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-[box-shadow,transform,opacity] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${
        syncing ? "ring-1 ring-[var(--brand)]/25" : ""
      }`}
    >
      {syncing && (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]" role="status">
          Salvando…
        </p>
      )}
      {face}
    </article>
  );
}

export const KanbanCard = memo(KanbanCardInner, (prev, next) => {
  return (
    leadVisualKey(prev.lead) === leadVisualKey(next.lead) &&
    prev.detailHref === next.detailHref &&
    prev.onWhatsAppChat === next.onWhatsAppChat &&
    prev.overlay === next.overlay &&
    prev.syncing === next.syncing
  );
});

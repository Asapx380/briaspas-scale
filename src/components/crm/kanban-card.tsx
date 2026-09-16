"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChatCircleDots, Phone } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { leadScore, leadTier, tierLabel, toBrazilianWhatsAppNumber } from "@/lib/crm/pipeline";
import type { CrmLead } from "@/lib/crm/types";

type KanbanCardProps = {
  lead: CrmLead;
  onWhatsAppChat?: (lead: CrmLead) => void;
};

export function KanbanCard({ lead, onWhatsAppChat }: KanbanCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { leadId: lead.id, status: lead.status },
  });

  const score = leadScore(lead);
  const tier = leadTier(score);
  const whatsapp = toBrazilianWhatsAppNumber(lead.phone);
  const meta = [lead.niche, lead.city].filter(Boolean).join(" · ");

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  function openDetail() {
    router.push(`/app/crm/${lead.id}`);
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  }

  function stopDrag(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={onCardKeyDown}
      aria-label={`${lead.company_name}, score ${score}`}
      className="cursor-grab rounded-2xl border border-black/[0.04] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-[box-shadow,transform] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex min-w-8 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums text-white ${
            score >= 70 ? "bg-[#1A7E3A]" : score >= 45 ? "bg-[#34C759]" : "bg-[#8E8E93]"
          }`}
        >
          {score}
        </span>
        {(tier === "quente" || tier === "morno") && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              tier === "quente"
                ? "bg-[#E8F8EE] text-[#1A7E3A]"
                : "bg-[#FFF4E5] text-[#B25E00]"
            }`}
          >
            {tierLabel(tier)}
          </span>
        )}
      </div>

      <h3 className="mt-2.5 truncate text-[15px] font-semibold tracking-tight text-[var(--text)]">
        {lead.company_name}
      </h3>
      {meta && <p className="mt-0.5 truncate text-xs text-[var(--text-4)]">{meta}</p>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {lead.phone ? (
          <a
            href={`tel:${lead.phone.replace(/\D/g, "")}`}
            onClick={stopDrag}
            onPointerDown={stopDrag}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] px-2 py-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)]"
          >
            <Phone size={14} /> Ligar
          </a>
        ) : (
          <span className="inline-flex items-center justify-center rounded-xl border border-dashed border-black/8 px-2 py-2 text-xs text-[var(--text-5)]">
            Sem tel.
          </span>
        )}
        {whatsapp ? (
          <button
            type="button"
            onClick={(event) => {
              stopDrag(event);
              if (onWhatsAppChat) onWhatsAppChat(lead);
              else window.open(`https://wa.me/${whatsapp}`, "_blank", "noopener,noreferrer");
            }}
            onPointerDown={stopDrag}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] px-2 py-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)]"
          >
            <ChatCircleDots size={14} /> WhatsApp
          </button>
        ) : (
          <span className="inline-flex items-center justify-center rounded-xl border border-dashed border-black/8 px-2 py-2 text-xs text-[var(--text-5)]">
            Sem WA
          </span>
        )}
      </div>
    </article>
  );
}

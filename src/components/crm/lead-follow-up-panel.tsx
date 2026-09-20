"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circle } from "@phosphor-icons/react/dist/csr/Circle";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { useMemo, useState } from "react";
import {
  listFollowUpTasksForLead,
  listTimelineForLead,
  toggleFollowUpTask,
  type LeadTimelineEntry,
} from "@/lib/crm/lead-timeline";
import { formatDate } from "@/lib/crm/pipeline";

type LeadFollowUpPanelProps = {
  leadId: number;
  followUpAt: string | null;
  refreshKey?: number;
};

function timelineLabel(entry: LeadTimelineEntry) {
  switch (entry.kind) {
    case "outreach_copy":
      return "Mensagem copiada";
    case "outreach_whatsapp":
      return "WhatsApp aberto";
    case "follow_up_scheduled":
      return "Follow-up agendado";
    case "follow_up_task_done":
      return "Tarefa concluída";
    case "maps_enriched":
      return "Dados do Google Maps";
    default:
      return entry.title;
  }
}

export function LeadFollowUpPanel({ leadId, followUpAt, refreshKey = 0 }: LeadFollowUpPanelProps) {
  const [taskTick, setTaskTick] = useState(0);

  const tasks = useMemo(
    () => (taskTick >= 0 ? listFollowUpTasksForLead(leadId) : []),
    [leadId, taskTick, refreshKey],
  );
  const timeline = useMemo(
    () => (taskTick >= 0 ? listTimelineForLead(leadId) : []),
    [leadId, taskTick, refreshKey],
  );

  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] p-4 sm:p-5"
      aria-labelledby="lead-followup-heading"
    >
      <div className="flex items-start gap-2">
        <ClockCounterClockwise size={20} className="mt-0.5 text-[var(--text-4)]" aria-hidden />
        <div>
          <h2 id="lead-followup-heading" className="text-base font-semibold text-[var(--text)]">
            Follow-up e histórico
          </h2>
          <p className="mt-1 text-sm text-[var(--text-4)]">
            Tarefas rápidas e eventos desta sessão (sem migration; dados locais do navegador).
          </p>
          {followUpAt && (
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Próximo follow-up:{" "}
              <time dateTime={followUpAt}>{formatDate(followUpAt)}</time>
            </p>
          )}
        </div>
      </div>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--text-4)]">
        Tarefas sugeridas
      </h3>
      <ul className="mt-2 space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => {
                toggleFollowUpTask(leadId, task.id, !task.done);
                setTaskTick((tick) => tick + 1);
              }}
              className="flex w-full items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left text-sm text-[var(--text-2)] hover:bg-[var(--neu-bg-well)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              aria-pressed={task.done}
            >
              {task.done ? (
                <CheckCircle size={18} weight="fill" className="shrink-0 text-[var(--success)]" />
              ) : (
                <Circle size={18} className="shrink-0 text-[var(--text-4)]" />
              )}
              <span className={task.done ? "text-[var(--text-4)] line-through" : undefined}>
                {task.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {timeline.length > 0 && (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-4)]">
            Histórico recente
          </h3>
          <ul className="mt-2 space-y-2">
            {timeline.slice(0, 8).map((entry) => (
              <li key={entry.id} className="text-xs text-[var(--text-3)]">
                <span className="font-medium text-[var(--text-2)]">{timelineLabel(entry)}</span>
                {" · "}
                {new Date(entry.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {entry.detail && entry.kind !== "follow_up_scheduled" && (
                  <p className="mt-0.5 line-clamp-2 text-[var(--text-4)]">{entry.detail}</p>
                )}
                {entry.kind === "follow_up_scheduled" && entry.detail && (
                  <p className="mt-0.5 text-[var(--text-4)]">
                    {formatDate(entry.detail)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

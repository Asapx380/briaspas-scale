"use client";

import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ArchivedLead = {
  id: number;
  company_name: string;
  city: string | null;
  niche: string | null;
  deleted_at: string;
};

function formatDeletedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function CrmTrashView({ initialLeads }: { initialLeads: ArchivedLead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function restoreLead(lead: ArchivedLead) {
    setRestoringId(lead.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/restore`, { method: "POST" });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Não foi possível restaurar o lead.");
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setMessage(`${lead.company_name} voltou para o CRM.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível restaurar o lead.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/app/crm"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-[var(--text-3)] hover:bg-[var(--neu-bg-pop)] hover:text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      >
        <ArrowLeft size={16} aria-hidden /> Voltar ao CRM
      </Link>

      <header className="mt-5 flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] text-[var(--text-3)]">
          <Trash size={20} aria-hidden />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">Lixeira</h1>
          <p className="mt-1 text-sm text-[var(--text-3)]">Leads removidos podem ser restaurados a qualquer momento.</p>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">{message}</p>
      {message && <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-4 py-3 text-sm text-[var(--text-2)]">{message}</p>}

      {leads.length === 0 ? (
        <section className="mt-10 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center">
          <h2 className="font-semibold text-[var(--text)]">A lixeira está vazia</h2>
          <p className="mt-2 text-sm text-[var(--text-3)]">Leads removidos aparecerão aqui para restauração.</p>
        </section>
      ) : (
        <ul className="mt-8 space-y-3" aria-label="Leads na lixeira">
          {leads.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-[var(--text)]">{lead.company_name}</h2>
                <p className="mt-1 text-sm text-[var(--text-3)]">
                  {[lead.niche, lead.city].filter(Boolean).join(" · ") || "Sem categoria ou cidade"}
                  <span className="mx-1.5 text-[var(--text-5)]" aria-hidden>·</span>
                  Removido em {formatDeletedAt(lead.deleted_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void restoreLead(lead)}
                disabled={restoringId === lead.id}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-3.5 text-sm font-semibold text-[var(--text-2)] transition-[background-color,transform] duration-150 hover:bg-[var(--brand-hover)]/10 hover:text-[var(--brand)] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                <ArrowCounterClockwise size={16} aria-hidden />
                {restoringId === lead.id ? "Restaurando…" : "Restaurar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

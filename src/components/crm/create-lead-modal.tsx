"use client";

import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { FormEvent, useState } from "react";
import type { CrmLead } from "@/lib/crm/types";
import { Spinner } from "@/components/ui/async-feedback";

const FIELD =
  "mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-4)] focus:border-[var(--brand)]/40 focus:outline-none focus:ring-2 focus:ring-[rgba(0,113,227,0.2)] disabled:opacity-60";

type CreateLeadModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (lead: CrmLead) => void;
};

export function CreateLeadModal({ open, onClose, onCreated }: CreateLeadModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function requestClose() {
    if (busy) return;
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "manual",
          companyName: form.get("companyName"),
          phone: form.get("phone") || null,
          email: form.get("email") || null,
          niche: form.get("niche"),
          city: form.get("city"),
          address: form.get("address") || null,
          websiteUrl: form.get("websiteUrl") || null,
          googleMapsUrl: form.get("googleMapsUrl") || null,
          rating: null,
          reviewCount: null,
        }),
      });
      const payload = (await response.json()) as {
        data?: { id?: number; status?: CrmLead["status"] };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.id) {
        throw new Error(payload.error?.message ?? "Não foi possível criar o lead.");
      }
      onCreated({
        id: payload.data.id,
        company_name: String(form.get("companyName") ?? "Novo lead"),
        phone: String(form.get("phone") || "") || null,
        email: String(form.get("email") || "") || null,
        address: String(form.get("address") || "") || null,
        niche: String(form.get("niche") || "") || null,
        city: String(form.get("city") || "") || null,
        status: payload.data.status ?? "new",
        notes: null,
        estimated_value: null,
        follow_up_at: null,
        website_url: String(form.get("websiteUrl") || "") || null,
        google_maps_url: String(form.get("googleMapsUrl") || "") || null,
        rating: null,
        review_count: null,
        source: "manual",
        slug: "novo-lead",
        visit_count: 0,
        site_status: "not_generated",
        site_source: null,
        site_brief: null,
        ai_diagnosis: null,
        ai_outreach: null,
        created_at: new Date().toISOString(),
        updated_at: null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o lead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-lead-title"
      aria-busy={busy}
      onClick={requestClose}
    >
      <div
        className="app-card w-full max-w-lg p-5 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="create-lead-title" className="text-lg font-semibold text-[var(--text)]">
              Criar lead
            </h2>
            <p className="mt-1 text-sm text-[var(--text-3)]">Cadastro manual rápido no CRM.</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={busy}
            className="grid size-11 place-items-center rounded-lg text-[var(--text-4)] hover:bg-[var(--neu-bg-well)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-50"
            aria-label="Fechar criação de lead"
            title="Fechar"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[var(--text-3)] sm:col-span-2">
            Nome da empresa
            <input name="companyName" required maxLength={200} disabled={busy} className={FIELD} placeholder="Ex.: Berg Barbearia" />
          </label>
          <label className="block text-xs font-medium text-[var(--text-3)]">
            Telefone
            <input name="phone" type="tel" maxLength={80} disabled={busy} className={FIELD} placeholder="(86) 99999-9999" />
          </label>
          <label className="block text-xs font-medium text-[var(--text-3)]">
            E-mail
            <input name="email" type="email" maxLength={320} disabled={busy} className={FIELD} placeholder="contato@empresa.com" />
          </label>
          <label className="block text-xs font-medium text-[var(--text-3)]">
            Categoria / nicho
            <input name="niche" required maxLength={80} disabled={busy} className={FIELD} placeholder="Barbearia" />
          </label>
          <label className="block text-xs font-medium text-[var(--text-3)]">
            Cidade
            <input name="city" required maxLength={100} disabled={busy} className={FIELD} placeholder="Teresina, PI" />
          </label>
          <label className="block text-xs font-medium text-[var(--text-3)] sm:col-span-2">
            Endereço
            <input name="address" maxLength={500} disabled={busy} className={FIELD} placeholder="Rua, número e bairro" />
          </label>
          <label className="block text-xs font-medium text-[var(--text-3)]">
            Site
            <input name="websiteUrl" type="url" maxLength={500} disabled={busy} className={FIELD} placeholder="https://..." />
          </label>
          <label className="block text-xs font-medium text-[var(--text-3)]">
            Google Maps
            <input name="googleMapsUrl" type="url" maxLength={500} disabled={busy} className={FIELD} placeholder="https://maps.google.com/..." />
          </label>

          {error && (
            <p role="alert" className="sm:col-span-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={busy}
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-solid)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-solid-hover)] disabled:opacity-60"
            >
              {busy ? <Spinner className="size-4" /> : <Plus size={16} weight="bold" />}
              {busy ? "Salvando..." : "Criar lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

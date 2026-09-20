"use client";

import { MapPinLine } from "@phosphor-icons/react/dist/csr/MapPinLine";
import { useState } from "react";
import { appendTimelineEntry } from "@/lib/crm/lead-timeline";
import type { CrmLead } from "@/lib/crm/types";

type LeadMapsEnrichPanelProps = {
  lead: CrmLead;
  demoMode?: boolean;
  onLeadUpdated: (patch: Partial<CrmLead>) => void;
  onTimelineChange?: () => void;
};

export function LeadMapsEnrichPanel({
  lead,
  demoMode = false,
  onLeadUpdated,
  onTimelineChange,
}: LeadMapsEnrichPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const missingHints = [
    !lead.phone && "telefone",
    !lead.address && "endereço",
    !lead.google_maps_url && "link do Maps",
    lead.rating == null && "avaliação",
  ].filter(Boolean);

  async function onEnrich() {
    if (demoMode || loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/enrich-from-places`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        enriched?: boolean;
        message?: string;
        matchedPlace?: string;
        fields?: string[];
        lead?: Partial<CrmLead>;
      };

      if (!response.ok) {
        setError(payload.error?.message ?? "Não foi possível enriquecer o lead.");
        return;
      }

      if (payload.lead) {
        onLeadUpdated(payload.lead);
      }

      if (payload.enriched) {
        appendTimelineEntry({
          leadId: lead.id,
          kind: "maps_enriched",
          title: "Enriquecido via Google Maps",
          detail: payload.matchedPlace ?? lead.company_name,
        });
        onTimelineChange?.();
        setMessage(
          `Campos atualizados: ${(payload.fields ?? []).join(", ") || "dados do Maps"}.`,
        );
      } else {
        setMessage(payload.message ?? "Nenhum campo novo para preencher.");
      }
    } catch {
      setError("Falha de rede ao consultar o Google Maps.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Enriquecer com Google Maps</h3>
          <p className="mt-1 text-xs text-[var(--text-4)]">
            Busca o estabelecimento pelo nome e cidade e preenche apenas campos vazios (telefone,
            endereço, site, Maps, avaliações).
          </p>
          {missingHints.length > 0 && (
            <p className="mt-2 text-xs text-[var(--text-3)]">
              Pendências detectadas: {missingHints.join(", ")}.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void onEnrich()}
          disabled={demoMode || loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--brand-solid)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-solid-hover)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          <MapPinLine size={18} aria-hidden />
          {loading ? "Buscando..." : "Buscar no Maps"}
        </button>
      </div>
      {demoMode && (
        <p role="status" className="mt-3 text-xs text-[var(--text-4)]">
          Modo demonstração: enriquecimento desativado.
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-2)]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}
    </div>
  );
}

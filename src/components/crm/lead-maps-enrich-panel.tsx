"use client";

import { MapPinLine } from "@phosphor-icons/react/dist/csr/MapPinLine";
import { useState } from "react";
import { appendTimelineEntry } from "@/lib/crm/lead-timeline";
import type { CrmLead } from "@/lib/crm/types";

type LeadMapsEnrichPanelProps = {
  lead: CrmLead;
  demoMode?: boolean;
  onTimelineChange?: () => void;
};

type PlacePreview = {
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
};

export function LeadMapsEnrichPanel({
  lead,
  demoMode = false,
  onTimelineChange,
}: LeadMapsEnrichPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlacePreview[]>([]);

  const missingHints = [
    !lead.phone && "telefone",
    !lead.address && "endereço",
    !lead.google_maps_url && "link do Maps",
    lead.rating == null && "avaliação",
  ].filter(Boolean);

  async function onEnrich() {
    if (demoMode || loading) return;
    setLoading(true);
    setError(null);
    setPlaces([]);
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/enrich-from-places`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        places?: PlacePreview[];
      };

      if (!response.ok) {
        setError(payload.error?.message ?? "Não foi possível enriquecer o lead.");
        return;
      }

      const nextPlaces = payload.places ?? [];
      setPlaces(nextPlaces);
      appendTimelineEntry({
        leadId: lead.id,
        kind: "maps_consulted",
        title: "Google Maps consultado",
        detail: nextPlaces[0]?.name ?? lead.company_name,
      });
      onTimelineChange?.();
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
            Busca pelo nome e cidade para você confirmar os dados. A consulta é temporária e não
            altera o lead automaticamente.
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
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}
      {places.length > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--neu-bg-well)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text)]">Resultados para conferência</h4>
              <p className="mt-1 text-xs text-[var(--text-4)]">
                Escolha o estabelecimento correto e confira as informações diretamente no Maps.
              </p>
            </div>
            <span
              className="shrink-0 whitespace-nowrap font-sans text-xs font-normal text-[var(--maps-attribution)]"
              translate="no"
            >
              Google Maps
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {places.map((place, index) => (
              <li key={`${place.name}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{place.name}</p>
                    {(place.category || place.address) && (
                      <p className="mt-1 text-xs text-[var(--text-4)]">
                        {[place.category, place.address].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  {place.googleMapsUrl && (
                    <a
                      href={place.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--neu-bg-pop)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                    >
                      Conferir no Maps
                    </a>
                  )}
                </div>
                <p className="mt-2 text-xs text-[var(--text-3)]">
                  {[place.phone, place.websiteUrl, place.rating != null ? `${place.rating.toFixed(1)} (${place.reviewCount ?? 0} avaliações)` : null]
                    .filter(Boolean)
                    .join(" · ") || "Sem detalhes adicionais disponíveis."}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

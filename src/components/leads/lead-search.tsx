"use client";

import {
  ArrowSquareOut,
  Buildings,
  Check,
  EnvelopeSimple,
  FloppyDisk,
  MapPin,
  MagnifyingGlass,
  Phone,
  Star,
} from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import {
  DEFAULT_LEAD_SEARCH_LIMIT,
  LEAD_SEARCH_LIMIT_OPTIONS,
  type LeadSearchLimitOption,
} from "@/lib/lead-sources/search-limits";
import type {
  DiscoveredLead,
  LeadSearchResult,
} from "@/lib/lead-sources/types";

type ApiSuccess = {
  data: LeadSearchResult;
};

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

type SaveState = "saving" | "saved" | "duplicate" | "error";

async function requestLeads(
  niche: string,
  city: string,
  limit: number,
  pageToken?: string,
): Promise<LeadSearchResult> {
  const response = await fetch("/api/v1/lead-searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ niche, city, limit, pageToken }),
  });

  const payload = (await response.json()) as ApiSuccess | ApiError;

  if (!response.ok || !("data" in payload)) {
    const message = "error" in payload ? payload.error?.message : null;
    throw new Error(message ?? "Não foi possível buscar empresas agora.");
  }

  return payload.data;
}

function LeadRow({
  lead,
  saveState,
  onSave,
}: {
  lead: DiscoveredLead;
  saveState?: SaveState;
  onSave: (lead: DiscoveredLead) => void;
}) {
  const isSaved = saveState === "saved" || saveState === "duplicate";

  return (
    <article className="grid gap-5 border-t border-black/8 py-6 first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="truncate text-lg font-semibold text-[var(--text)]">
            {lead.companyName}
          </h2>
          {lead.rating !== null && (
            <span className="inline-flex items-center gap-1 text-sm text-amber-600">
              <Star size={15} weight="fill" aria-hidden="true" />
              <span>{lead.rating.toLocaleString("pt-BR")}</span>
              <span className="text-[var(--text-4)]">({lead.reviewCount})</span>
            </span>
          )}
        </div>

        <div className="mt-3 grid gap-2 text-sm text-[var(--text-3)] sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <Phone size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <span>{lead.phone ?? "Telefone não informado"}</span>
          </p>
          {lead.email && (
            <p className="flex items-start gap-2">
              <EnvelopeSimple size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
              <span className="truncate">{lead.email}</span>
            </p>
          )}
          <p className="flex items-start gap-2 sm:col-span-2">
            <MapPin size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <span>{lead.address ?? "Endereço não informado"}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <button
          type="button"
          onClick={() => onSave(lead)}
          disabled={saveState === "saving" || isSaved}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] active:translate-y-px disabled:cursor-default disabled:bg-[var(--brand)]/35 disabled:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          {isSaved ? (
            <Check size={16} weight="bold" aria-hidden="true" />
          ) : (
            <FloppyDisk size={16} weight="bold" aria-hidden="true" />
          )}
          {saveState === "saving"
            ? "Salvando..."
            : isSaved
              ? "Salvo no CRM"
              : saveState === "error"
                ? "Tentar novamente"
                : "Salvar no CRM"}
        </button>
        {lead.websiteUrl && (
          <a
            href={lead.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/8 px-3 py-2 text-sm font-medium text-[var(--text-2)] transition-colors hover:border-[var(--brand)]/30 hover:bg-[var(--brand-hover)]/10 hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          >
            Site
            <ArrowSquareOut size={15} aria-hidden="true" />
          </a>
        )}
        {lead.googleMapsUrl && (
          <a
            href={lead.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/8 px-3 py-2 text-sm font-medium text-[var(--text-2)] transition-colors hover:border-[var(--brand)]/30 hover:bg-[var(--brand-hover)]/10 hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          >
            Mapa
            <ArrowSquareOut size={15} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

export function LeadSearch() {
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState<LeadSearchLimitOption>(DEFAULT_LEAD_SEARCH_LIMIT);
  const [searchedFor, setSearchedFor] = useState<{
    niche: string;
    city: string;
    limit: number;
  } | null>(null);
  const [leads, setLeads] = useState<DiscoveredLead[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedNiche = niche.trim();
    const normalizedCity = city.trim();

    if (normalizedNiche.length < 2 || normalizedCity.length < 2) {
      setError("Preencha o nicho e a cidade com pelo menos 2 caracteres.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await requestLeads(normalizedNiche, normalizedCity, limit);
      setLeads(result.leads);
      setNextPageToken(result.nextPageToken);
      setSourceLabel(result.sourceLabel);
      setSearchedFor({ niche: normalizedNiche, city: normalizedCity, limit });
      setBulkMessage(null);
    } catch (requestError) {
      setLeads([]);
      setNextPageToken(null);
      setSourceLabel(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível buscar empresas agora.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLoadMore() {
    if (!searchedFor || !nextPageToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await requestLeads(
        searchedFor.niche,
        searchedFor.city,
        searchedFor.limit,
        nextPageToken,
      );
      setLeads((currentLeads) => [...currentLeads, ...result.leads]);
      setNextPageToken(result.nextPageToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível carregar mais empresas.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(lead: DiscoveredLead) {
    if (!searchedFor) return;

    setSaveStates((currentStates) => ({
      ...currentStates,
      [lead.sourceId]: "saving",
    }));

    try {
      const response = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googlePlaceId: lead.source === "google_places" ? lead.sourceId : null,
          source: lead.source,
          sourceRef: lead.sourceId,
          companyName: lead.companyName,
          phone: lead.phone,
          address: lead.address,
          niche: searchedFor.niche,
          city: searchedFor.city,
          websiteUrl: lead.websiteUrl,
          googleMapsUrl: lead.googleMapsUrl,
          rating: lead.rating,
          reviewCount: lead.reviewCount,
          email: lead.email,
          instagram: lead.instagram,
          facebookId: lead.facebookId,
          twitter: lead.twitter,
          latitude: lead.latitude,
          longitude: lead.longitude,
        }),
      });
      const payload = (await response.json()) as ApiError | { data: { id: number } };

      if (response.status === 409) {
        setSaveStates((currentStates) => ({
          ...currentStates,
          [lead.sourceId]: "duplicate",
        }));
        return;
      }

      if (!response.ok || !("data" in payload)) {
        throw new Error("Não foi possível salvar o lead.");
      }

      setSaveStates((currentStates) => ({
        ...currentStates,
        [lead.sourceId]: "saved",
      }));
    } catch {
      setSaveStates((currentStates) => ({
        ...currentStates,
        [lead.sourceId]: "error",
      }));
    }
  }

  async function handleSaveAll() {
    if (!searchedFor || leads.length === 0) return;
    setIsSavingAll(true);
    setBulkMessage(null);

    try {
      const response = await fetch("/api/v1/leads/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: leads[0]?.source,
          leads: leads.map((lead) => ({
            ...lead,
            niche: lead.category ?? searchedFor.niche,
            city: searchedFor.city,
            sourceRef: lead.sourceId,
            googlePlaceId: lead.source === "google_places" ? lead.sourceId : null,
            photoUrls: [],
          })),
        }),
      });
      const payload = (await response.json()) as
        | { data: { imported: number; duplicates: number } }
        | ApiError;
      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error?.message : undefined);
      }

      const states = Object.fromEntries(
        leads.map((lead) => [lead.sourceId, "saved" as SaveState]),
      );
      setSaveStates((current) => ({ ...current, ...states }));
      setBulkMessage(
        `${payload.data.imported} empresas adicionadas. ${payload.data.duplicates} duplicadas ignoradas.`,
      );
    } catch (saveError) {
      setBulkMessage(
        saveError instanceof Error && saveError.message
          ? saveError.message
          : "Não foi possível salvar todas as empresas.",
      );
    } finally {
      setIsSavingAll(false);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="lead-search-title">
      <h2 id="lead-search-title" className="sr-only">
        Formulário de busca de empresas
      </h2>

      <form
        onSubmit={handleSearch}
        className="grid gap-4 rounded-2xl border border-black/8 bg-[var(--neu-bg-pop)] p-5 sm:p-6 lg:grid-cols-[1fr_1fr_minmax(8.5rem,10rem)_auto] lg:items-end"
      >
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Nicho
          <input
            name="niche"
            value={niche}
            onChange={(event) => setNiche(event.target.value)}
            placeholder="Ex.: barbearia"
            autoComplete="off"
            minLength={2}
            maxLength={80}
            required
            className="h-11 rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] px-3.5 text-base text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-4)] focus:border-[var(--brand)]/60 focus:ring-2 focus:ring-[var(--brand)]/15"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Cidade
          <input
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Ex.: São Paulo, SP"
            autoComplete="address-level2"
            minLength={2}
            maxLength={100}
            required
            className="h-11 rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] px-3.5 text-base text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-4)] focus:border-[var(--brand)]/60 focus:ring-2 focus:ring-[var(--brand)]/15"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Quantos leads?
          <select
            name="limit"
            aria-label="Limite"
            value={limit}
            onChange={(event) =>
              setLimit(Number(event.target.value) as LeadSearchLimitOption)
            }
            className="h-11 rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] px-3.5 text-base text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)]/60 focus:ring-2 focus:ring-[var(--brand)]/15"
          >
            {LEAD_SEARCH_LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] active:translate-y-px disabled:cursor-wait disabled:bg-[var(--brand)]/50 disabled:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
          {isLoading ? "Buscando..." : "Buscar empresas"}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      {isLoading && leads.length === 0 && (
        <div className="mt-8 space-y-0" aria-label="Carregando empresas">
          {[0, 1, 2].map((item) => (
            <div key={item} className="border-t border-black/8 py-6 first:border-t-0">
              <div className="h-5 w-2/5 animate-pulse rounded bg-white/10" />
              <div className="mt-4 h-4 w-1/4 animate-pulse rounded bg-white/[0.07]" />
              <div className="mt-3 h-4 w-3/5 animate-pulse rounded bg-white/[0.07]" />
            </div>
          ))}
        </div>
      )}

      {searchedFor && !isLoading && leads.length === 0 && !error && (
        <div className="mt-12 flex max-w-xl items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-black/8 bg-[var(--neu-bg-well)] text-[var(--text-3)]">
            <Buildings size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-2)]">Nenhuma empresa encontrada</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-3)]">
              Tente um nicho mais amplo ou confira o nome da cidade.
            </p>
          </div>
        </div>
      )}

      {leads.length > 0 && (
        <div className="mt-10">
          <div className="mb-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[var(--brand)]">
                {leads.length} {leads.length === 1 ? "empresa encontrada" : "empresas encontradas"}
              </p>
              {searchedFor && (
                <p className="mt-1 text-sm text-[var(--text-4)]">
                  {searchedFor.niche} em {searchedFor.city}
                  {sourceLabel ? ` · Fonte: ${sourceLabel}` : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSavingAll}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] active:translate-y-px disabled:cursor-wait disabled:bg-[var(--brand)]/50 disabled:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <FloppyDisk size={17} weight="bold" aria-hidden="true" />
              {isSavingAll ? "Salvando..." : "Salvar todas no CRM"}
            </button>
          </div>

          {bulkMessage && (
            <p role="status" className="mt-4 rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] px-4 py-3 text-sm text-[var(--text-2)]">
              {bulkMessage}
            </p>
          )}

          <div aria-live="polite">
            {leads.map((lead) => (
              <LeadRow
                key={`${lead.source}:${lead.sourceId}`}
                lead={lead}
                saveState={saveStates[lead.sourceId]}
                onSave={handleSave}
              />
            ))}
          </div>

          {nextPageToken && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoading}
              className="mt-4 rounded-xl border border-black/8 px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--brand)]/30 hover:bg-[var(--brand-hover)]/10 active:translate-y-px disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              {isLoading ? "Carregando..." : "Carregar mais empresas"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

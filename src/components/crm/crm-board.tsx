"use client";

import {
  ArrowRight,
  ArrowSquareOut,
  Buildings,
  CalendarBlank,
  ChatCircleDots,
  Check,
  EnvelopeSimple,
  Eye,
  Fire,
  GlobeHemisphereWest,
  MagicWand,
  MapPin,
  NotePencil,
  Phone,
  Sparkle,
  Star,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { SiteBrief } from "@/lib/sites/design-plan";
import { WhatsAppChatModal, WhatsAppControlPanel } from "@/components/crm/whatsapp-chat";

export type LeadStatus = "new" | "contacted" | "replied" | "hot" | "proposal" | "won" | "lost";

export 
type LeadSignal = { key: "overdue" | "stale" | "hot" | "no_site"; label: string; className: string };

function leadSignals(lead: CrmLead, nowMs: number): LeadSignal[] {
  const signals: LeadSignal[] = [];
  const closed = lead.status === "won" || lead.status === "lost";
  if (!closed && lead.follow_up_at && new Date(lead.follow_up_at).getTime() < nowMs) {
    signals.push({
      key: "overdue",
      label: "Atrasado",
      className: "bg-rose-500/12 text-rose-700 border-rose-500/20",
    });
  }
  const stamp = lead.updated_at ?? lead.created_at;
  if (!closed && stamp && nowMs - new Date(stamp).getTime() > 7 * 24 * 60 * 60 * 1000) {
    signals.push({
      key: "stale",
      label: "Parado",
      className: "bg-amber-500/12 text-amber-800 border-amber-500/20",
    });
  }
  if (lead.status === "hot" || lead.status === "proposal") {
    signals.push({
      key: "hot",
      label: "Quente",
      className: "bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20",
    });
  }
  if (!lead.site_status || lead.site_status === "not_generated") {
    signals.push({
      key: "no_site",
      label: "Sem site",
      className: "bg-[var(--neu-bg-well)] text-[var(--text-3)] border-black/8",
    });
  }
  return signals.slice(0, 2);
}

export type CrmLead = {
  id: number;
  company_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  niche: string | null;
  city: string | null;
  status: LeadStatus;
  notes: string | null;
  estimated_value: number | null;
  follow_up_at: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number | null;
  source: string;
  slug: string;
  visit_count: number;
  site_status: "not_generated" | "generating" | "ready" | "failed" | "published";
  site_source: "uploaded" | "generated" | null;
  site_brief: SiteBrief | null;
  ai_diagnosis: {
    resumo?: string;
    dorPrincipal?: string;
    prioridade?: string;
  } | null;
  ai_outreach: {
    mensagem?: string;
    canal?: string;
    channel?: string;
  } | null;
  created_at: string;
  updated_at: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  maps2sheets: "Maps2Sheets",
  google_places: "Google Places",
  openstreetmap: "OpenStreetMap",
  foursquare: "Foursquare",
  scraper_kit: "Scraper Kit",
};

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contatado" },
  { value: "replied", label: "Respondeu" },
  { value: "hot", label: "Quente" },
  { value: "proposal", label: "Proposta enviada" },
  { value: "won", label: "Fechado" },
  { value: "lost", label: "Perdido" },
];

const COLUMNS: { key: string; title: string; description: string; statuses: LeadStatus[] }[] = [
  { key: "new", title: "Novo", description: "Ainda não abordado", statuses: ["new"] },
  { key: "contact", title: "Em contato", description: "Abordagem iniciada", statuses: ["contacted", "replied"] },
  { key: "hot", title: "Quente", description: "Interesse ou proposta", statuses: ["hot", "proposal"] },
  { key: "won", title: "Fechado", description: "Venda concluída", statuses: ["won"] },
];

function formatMoney(value: number | null) {
  return value === null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toBrazilianWhatsAppNumber(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

type LeadPatch = Pick<CrmLead, "id"> & Partial<CrmLead>;

function briefingText(brief: SiteBrief) {
  return [
    `# Briefing — ${brief.paletteName}`,
    `\n## Resumo\n${brief.resumoDoNegocio}`,
    `\n## Tom de voz\n${brief.tomDeVoz}`,
    `\n## Cores\n${Object.entries(brief.colors).map(([name, color]) => `${name}: ${color}`).join("\n")}`,
    `\n## Tipografia\n${brief.typography.display} + ${brief.typography.body}\n${brief.typography.pairingRationale}`,
    `\n## Conceito\n${brief.layoutConcept}`,
    `\n## Serviços\n${brief.servicosSugeridos.map((item) => `- ${item.nome}: ${item.microbeneficio}`).join("\n")}`,
    `\n## Diferenciais\n${brief.diferenciais.map((item) => `- ${item}`).join("\n")}`,
    `\n## CTA\n${brief.ctaPrincipal}`,
    brief.fotoSugerida ? `\n## Foto sugerida\n${brief.fotoSugerida.url}\n${brief.fotoSugerida.credito}` : "",
  ].join("\n");
}

function LeadCard({ lead, onUpdated, onDeleted, nowMs }: { lead: CrmLead; onUpdated: (lead: LeadPatch) => void; onDeleted: (id: number) => void; nowMs: number }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [estimatedValue, setEstimatedValue] = useState(lead.estimated_value?.toString() ?? "");
  const [followUpAt, setFollowUpAt] = useState(toLocalDateTime(lead.follow_up_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteBusy, setSiteBusy] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [brief, setBrief] = useState<SiteBrief | null>(lead.site_brief);
  const [copied, setCopied] = useState(false);
  const [outreachCopied, setOutreachCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [diagnosisBusy, setDiagnosisBusy] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState(lead.ai_diagnosis);
  const [outreach, setOutreach] = useState(lead.ai_outreach);

  async function generateBrief() {
    setSiteBusy(true);
    setSiteError(null);

    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/generate-brief`, {
        method: "POST",
      });
      const payload = await response.json() as {
        data?: {
          brief?: SiteBrief;
        };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.brief) {
        throw new Error(payload.error?.message ?? "Não foi possível gerar o briefing.");
      }
      setBrief(payload.data.brief);
      onUpdated({ id: lead.id, site_brief: payload.data.brief });
    } catch (generationError) {
      setSiteError(generationError instanceof Error ? generationError.message : "Não foi possível gerar o briefing.");
    } finally {
      setSiteBusy(false);
    }
  }

  async function uploadSite(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setSiteBusy(true); setSiteError(null);
    try {
      const formData = new FormData(); formData.set("site", file);
      const response = await fetch(`/api/v1/leads/${lead.id}/site-upload`, { method: "POST", body: formData });
      const payload = await response.json() as { data?: { site_status?: CrmLead["site_status"]; site_source?: CrmLead["site_source"] }; error?: { message?: string } };
      if (!response.ok || !payload.data?.site_status) throw new Error(payload.error?.message ?? "Não foi possível enviar o ZIP.");
      onUpdated({ id: lead.id, site_status: payload.data.site_status, site_source: payload.data.site_source ?? "uploaded" });
    } catch (uploadError) {
      setSiteError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o ZIP.");
    } finally { setSiteBusy(false); }
  }

  async function copyBrief() {
    if (!brief) return;
    await navigator.clipboard.writeText(briefingText(brief));
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  async function generateDiagnosis() {
    setDiagnosisBusy(true);
    setDiagnosisError(null);
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "whatsapp" }),
      });
      const payload = await response.json() as {
        data?: { diagnosis?: CrmLead["ai_diagnosis"]; outreach?: CrmLead["ai_outreach"] };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.diagnosis) {
        throw new Error(payload.error?.message ?? "Não foi possível gerar o diagnóstico.");
      }
      setDiagnosis(payload.data.diagnosis);
      setOutreach(payload.data.outreach ?? null);
      onUpdated({ id: lead.id, ai_diagnosis: payload.data.diagnosis, ai_outreach: payload.data.outreach ?? null });
    } catch (err) {
      setDiagnosisError(err instanceof Error ? err.message : "Não foi possível gerar o diagnóstico.");
    } finally {
      setDiagnosisBusy(false);
    }
  }

  async function copyOutreach() {
    if (!outreach?.mensagem) return;
    await navigator.clipboard.writeText(outreach.mensagem);
    setOutreachCopied(true);
    window.setTimeout(() => setOutreachCopied(false), 1800);
  }

  async function changePublication(action: "publish" | "unpublish") {
    setSiteBusy(true);
    setSiteError(null);
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/site`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json() as {
        data?: { site_status?: CrmLead["site_status"] };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.site_status) {
        throw new Error(payload.error?.message ?? "Não foi possível atualizar a publicação.");
      }
      onUpdated({ id: lead.id, site_status: payload.data.site_status });
    } catch (publicationError) {
      setSiteError(publicationError instanceof Error ? publicationError.message : "Não foi possível atualizar a publicação.");
    } finally {
      setSiteBusy(false);
    }
  }

  async function previewSite() {
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    setSiteBusy(true);
    setSiteError(null);
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/site-preview`, { method: "POST" });
      const payload = await response.json() as { data?: { url?: string }; error?: { message?: string } };
      if (!response.ok || !payload.data?.url) throw new Error(payload.error?.message ?? "Não foi possível abrir a pré-visualização.");
      if (previewWindow) previewWindow.location.href = payload.data.url;
      else window.location.href = payload.data.url;
    } catch (previewError) {
      previewWindow?.close();
      setSiteError(previewError instanceof Error ? previewError.message : "Não foi possível abrir a pré-visualização.");
    } finally {
      setSiteBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericValue = estimatedValue.trim() === "" ? null : Number(estimatedValue.replace(",", "."));
    if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0)) {
      setError("Informe um valor de venda válido.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes.trim() || null,
          estimatedValue: numericValue,
          followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null,
        }),
      });
      const payload = await response.json() as { lead?: Partial<CrmLead>; error?: { message?: string } };
      if (!response.ok || !payload.lead) throw new Error(payload.error?.message ?? "Não foi possível salvar.");

      onUpdated({
        ...lead,
        status,
        notes: notes.trim() || null,
        estimated_value: numericValue,
        follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : null,
      });
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead() {
    if (!window.confirm("Remover este lead e todos os dados e sites vinculados? Esta ação não pode ser desfeita.")) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/v1/leads/" + lead.id, { method: "DELETE" });
    if (response.ok) onDeleted(lead.id);
    else setError("Não foi possível remover este lead.");
    setSaving(false);
  }

  const formattedValue = formatMoney(lead.estimated_value);
  const whatsappNumber = toBrazilianWhatsAppNumber(lead.phone);
  const followUpOverdue = Boolean(
    lead.follow_up_at &&
    !["won", "lost"].includes(lead.status) &&
    new Date(lead.follow_up_at).getTime() < nowMs,
  );

  return (
    <article className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-[var(--text)]">{lead.company_name}</h3>
          {leadSignals(lead, nowMs).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {leadSignals(lead, nowMs).map((signal) => (
                <span
                  key={signal.key}
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${signal.className}`}
                >
                  {signal.label}
                </span>
              ))}
            </div>
          )}
          {lead.niche && <p className="mt-1 truncate text-xs text-[var(--brand)]/80">{lead.niche}</p>}
        </div>
        {(lead.status === "hot" || lead.status === "proposal") && (
          <Fire size={18} weight="fill" className="shrink-0 text-[var(--brand)]" aria-label="Lead quente" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md border border-black/8 bg-[var(--neu-bg-well)] px-2 py-1 text-[var(--text-3)]">{SOURCE_LABELS[lead.source] ?? lead.source}</span>
        {lead.rating !== null && <span className="inline-flex items-center gap-1 text-amber-600"><Star size={14} weight="fill" />{lead.rating.toFixed(1)}{lead.review_count !== null && <span className="text-[var(--text-4)]">({lead.review_count})</span>}</span>}
        {lead.visit_count > 0 && <span className="inline-flex items-center gap-1 text-[var(--brand)]"><Eye size={14} />{lead.visit_count} {lead.visit_count === 1 ? "visita" : "visitas"}</span>}
      </div>

      <div className="mt-4 space-y-2 text-xs leading-5 text-[var(--text-3)]">
        <p className="flex items-start gap-2"><Phone size={15} className="mt-0.5 shrink-0 text-[var(--text-4)]" /><span>{lead.phone ?? "Telefone não informado"}</span></p>
        {lead.email && <p className="flex items-start gap-2"><EnvelopeSimple size={15} className="mt-0.5 shrink-0 text-[var(--text-4)]" /><span className="truncate">{lead.email}</span></p>}
        <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-[var(--text-4)]" /><span className="line-clamp-2">{lead.address ?? lead.city ?? "Local não informado"}</span></p>
        {lead.follow_up_at && <p className={`flex items-start gap-2 ${followUpOverdue ? "font-semibold text-rose-600" : "text-[var(--brand)]"}`}><CalendarBlank size={15} className="mt-0.5 shrink-0" /><span>{followUpOverdue ? "Retorno atrasado" : "Retorno"}: {formatDate(lead.follow_up_at)}</span></p>}
      </div>

      {formattedValue && <p className="mt-4 border-t border-black/8 pt-3 text-sm font-semibold text-[var(--text-2)]">{formattedValue}</p>}
      {lead.notes && !editing && <p className="mt-3 line-clamp-3 rounded-lg bg-[var(--neu-bg-pop)] p-2.5 text-xs leading-5 text-[var(--text-3)]">{lead.notes}</p>}

      <div className="mt-4 rounded-lg border border-[var(--brand)]/15 bg-[var(--brand-hover)]/[0.055] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)]">
            <GlobeHemisphereWest size={15} /> Site personalizado
          </p>
          <span className="text-[11px] text-[var(--text-4)]">
            {lead.site_status === "not_generated" && "Sem site enviado"}
            {lead.site_status === "generating" && "Processando..."}
            {lead.site_status === "ready" && "Pronto para publicar"}
            {lead.site_status === "failed" && "Falhou"}
            {lead.site_status === "published" && "Publicado"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={siteBusy} onClick={generateBrief} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--brand)]/20 px-2.5 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-hover)]/10 disabled:cursor-wait disabled:opacity-60">
            <MagicWand size={14} weight="fill" /> {siteBusy ? "Gerando..." : brief ? "Regenerar briefing" : "Gerar briefing"}
          </button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-black/8 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)]">
            Enviar ZIP<input type="file" accept=".zip,application/zip" className="sr-only" disabled={siteBusy} onChange={uploadSite} />
          </label>
          {lead.site_source === "uploaded" && lead.site_status === "ready" && (
            <button type="button" disabled={siteBusy} onClick={previewSite} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--brand)]/20 px-2.5 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-hover)]/10 disabled:opacity-60">
              <Eye size={14} /> Pré-visualizar
            </button>
          )}
          {lead.site_status === "ready" && (
            <button type="button" disabled={siteBusy} onClick={() => changePublication("publish")} className="rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-60">
              {siteBusy ? "Publicando..." : "Publicar"}
            </button>
          )}
          {lead.site_status === "published" && (
            <button type="button" disabled={siteBusy} onClick={() => changePublication("unpublish")} className="rounded-md border border-black/8 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-3)] hover:bg-[var(--neu-bg-well)] hover:text-[var(--text)] disabled:opacity-60">
              {siteBusy ? "Atualizando..." : "Despublicar"}
            </button>
          )}
        </div>
        {siteError && <p role="alert" className="mt-2 text-xs leading-5 text-rose-600">{siteError}</p>}
        {brief && <section className="mt-4 space-y-3 border-t border-[var(--brand)]/15 pt-4 text-xs text-[var(--text-2)]"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-[var(--brand)]">Briefing do site</p><button type="button" onClick={copyBrief} className="text-[var(--brand)] hover:text-[var(--brand)]">{copied ? "Copiado" : "Copiar briefing"}</button></div><p className="leading-5">{brief.resumoDoNegocio}</p><p><strong>Tom:</strong> {brief.tomDeVoz}</p><div className="flex gap-1.5">{Object.entries(brief.colors).map(([name, color]) => <span key={name} title={`${name}: ${color}`} className="size-5 rounded-full border border-black/10" style={{ backgroundColor: color }} />)}</div><p><strong>Fontes:</strong> {brief.typography.display} + {brief.typography.body}</p><p><strong>Layout:</strong> {brief.layoutConcept}</p><ul className="space-y-1">{brief.servicosSugeridos.map((item) => <li key={item.nome}><strong>{item.nome}:</strong> {item.microbeneficio}</li>)}</ul><ul className="space-y-1 text-[var(--text-3)]">{brief.diferenciais.map((item) => <li key={item}>• {item}</li>)}</ul><p><strong>CTA:</strong> {brief.ctaPrincipal}</p>{brief.fotoSugerida && <a href={brief.fotoSugerida.url} target="_blank" rel="noreferrer" className="block text-[var(--brand)] hover:text-[var(--brand)]">Ver foto sugerida — {brief.fotoSugerida.credito}</a>}</section>}
      </div>

      <div className="mt-4 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <Sparkle size={15} weight="fill" /> Diagnóstico e abordagem
          </p>
          {diagnosis?.prioridade && (
            <span className="text-[11px] capitalize text-[var(--text-4)]">Prioridade {diagnosis.prioridade}</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={diagnosisBusy} onClick={generateDiagnosis} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60">
            {diagnosisBusy ? "Gerando..." : diagnosis ? "Regenerar diagnóstico" : "Gerar diagnóstico + copy"}
          </button>
          {outreach?.mensagem && (
            <button type="button" onClick={copyOutreach} className="rounded-md border border-black/8 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)]">
              {outreachCopied ? "Copy copiada" : "Copiar abordagem"}
            </button>
          )}
        </div>
        {diagnosisError && <p role="alert" className="mt-2 text-xs text-rose-600">{diagnosisError}</p>}
        {diagnosis?.dorPrincipal && (
          <div className="mt-3 space-y-2 text-xs leading-5 text-[var(--text-2)]">
            <p><strong>Dor:</strong> {diagnosis.dorPrincipal}</p>
            {diagnosis.resumo && <p className="text-[var(--text-3)]">{diagnosis.resumo}</p>}
            {outreach?.mensagem && <p className="rounded-lg bg-white/80 p-2.5 text-[var(--text-3)] whitespace-pre-wrap">{outreach.mensagem}</p>}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-black/8 pt-3 text-xs font-medium">
        {whatsappNumber && (
          <button type="button" onClick={() => setChatOpen(true)} className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-600">
            <ChatCircleDots size={14} /> Chat WhatsApp
          </button>
        )}
        {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:text-emerald-600">Abrir wa.me</a>}
        {lead.website_url && <a href={lead.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--brand)]">Site <ArrowSquareOut size={14} /></a>}
        {lead.google_maps_url && <a href={lead.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--brand)]">Mapa <ArrowSquareOut size={14} /></a>}
        {lead.site_status === "published" && <Link href={`/empresa/${lead.slug}`} target="_blank" className="inline-flex items-center gap-1 text-[var(--brand)]">Site criado <ArrowSquareOut size={14} /></Link>}
        <button type="button" onClick={() => setEditing((current) => !current)} className="ml-auto inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><NotePencil size={15} />Editar</button>
      </div>

      <WhatsAppChatModal
        leadId={lead.id}
        companyName={lead.company_name}
        phone={lead.phone}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {editing && (
        <form onSubmit={save} className="mt-4 space-y-3 border-t border-black/8 pt-4">
          <label className="block text-xs text-[var(--text-3)]">Status<select value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)} className="mt-1.5 w-full rounded-lg border border-black/8 bg-[var(--neu-bg-pop)] px-3 py-2 text-sm text-[var(--text)]">{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-xs text-[var(--text-3)]">Valor da venda<input value={estimatedValue} onChange={(event) => setEstimatedValue(event.target.value)} inputMode="decimal" placeholder="Ex.: 600,00" className="mt-1.5 w-full rounded-lg border border-black/8 bg-[var(--neu-bg-pop)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-4)]" /></label>
          <label className="block text-xs text-[var(--text-3)]">Próximo contato<input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} className="mt-1.5 w-full rounded-lg border border-black/8 bg-[var(--neu-bg-pop)] px-3 py-2 text-sm text-[var(--text)]" /></label>
          <label className="block text-xs text-[var(--text-3)]">Anotações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={10000} placeholder="O que foi conversado com este lead?" className="mt-1.5 w-full resize-y rounded-lg border border-black/8 bg-[var(--neu-bg-pop)] px-3 py-2 text-sm leading-5 text-[var(--text)] placeholder:text-[var(--text-4)]" /></label>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button disabled={saving} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-60"><Check size={15} weight="bold" />{saving ? "Salvando..." : "Salvar"}</button>
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/8 px-3 py-2 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)]"><X size={15} />Cancelar</button>
            <button type="button" disabled={saving} onClick={deleteLead} className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-400/10">Remover lead</button>
          </div>
        </form>
      )}
    </article>
  );
}

export function CrmBoard({
  initialLeads,
  loadError,
  whatsappConversations = [],
}: {
  initialLeads: CrmLead[];
  loadError: string | null;
  whatsappConversations?: Array<{
    id: number;
    contact_name: string | null;
    contact_phone: string | null;
    agent_enabled: boolean;
    last_message_at: string | null;
    lead_id: number | null;
  }>;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setNowMs(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const updateLead = (updated: LeadPatch) => setLeads((current) => current.map((lead) => lead.id === updated.id ? { ...lead, ...updated } : lead));
  const deleteLead = (id: number) => setLeads((current) => current.filter((lead) => lead.id !== id));
  const lostLeads = leads.filter((lead) => lead.status === "lost");
  const overdueCount = nowMs === 0 ? 0 : leads.filter((lead) => lead.follow_up_at && !["won", "lost"].includes(lead.status) && new Date(lead.follow_up_at).getTime() < nowMs).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Pipeline de vendas</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Seus leads</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[var(--text-3)]">Acompanhe cada empresa desde o primeiro contato até o fechamento.</p>
        </div>
        <Link href="/app/leads" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]">Adicionar empresas <ArrowRight size={17} weight="bold" /></Link>
      </div>

      <WhatsAppControlPanel conversations={whatsappConversations} />

      {loadError && <p role="alert" className="mt-8 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-700">{loadError}</p>}
      {!loadError && overdueCount > 0 && <p role="status" className="mt-8 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-800"><strong>{overdueCount} {overdueCount === 1 ? "follow-up atrasado" : "follow-ups atrasados"}.</strong> Os cards correspondentes estão destacados para você priorizar hoje.</p>}
      {!loadError && leads.length === 0 && <section className="mt-14 flex max-w-xl items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--brand)]/20 bg-[var(--brand-hover)]/10 text-[var(--brand)]"><Buildings size={24} /></div><div><h2 className="font-semibold text-[var(--text)]">Seu CRM está pronto</h2><p className="mt-2 text-sm leading-6 text-[var(--text-3)]">Busque empresas ou cadastre uma manualmente. Os leads aparecerão aqui automaticamente.</p></div></section>}

      {!loadError && leads.length > 0 && (
        <>
          <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Funil de vendas">
            {COLUMNS.map((column) => {
              const columnLeads = leads.filter((lead) => column.statuses.includes(lead.status));
              return <div key={column.key} className="app-card min-w-0 p-3"><div className="flex items-start justify-between gap-3 px-1 pb-3"><div><h2 className="text-sm font-semibold text-[var(--text)]">{column.title}</h2><p className="mt-1 text-xs text-[var(--text-4)]">{column.description}</p></div><span className="grid min-w-7 place-items-center rounded-lg border border-black/8 bg-[var(--neu-bg-well)] px-2 py-1 text-xs font-semibold text-[var(--text-2)]">{columnLeads.length}</span></div><div className="space-y-3">{columnLeads.map((lead) => <LeadCard key={lead.id} lead={lead} onUpdated={updateLead} onDeleted={deleteLead} nowMs={nowMs} />)}{columnLeads.length === 0 && <p className="rounded-xl border border-dashed border-black/8 px-4 py-7 text-center text-xs text-[var(--text-4)]">Nenhum lead nesta etapa</p>}</div></div>;
            })}
          </section>
          {lostLeads.length > 0 && <section className="mt-8 border-t border-black/8 pt-6"><h2 className="text-sm font-semibold text-[var(--text-2)]">Perdidos ({lostLeads.length})</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{lostLeads.map((lead) => <LeadCard key={lead.id} lead={lead} onUpdated={updateLead} onDeleted={deleteLead} nowMs={nowMs} />)}</div></section>}
        </>
      )}
    </main>
  );
}

"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { GlobeHemisphereWest } from "@phosphor-icons/react/dist/csr/GlobeHemisphereWest";
import { MagicWand } from "@phosphor-icons/react/dist/csr/MagicWand";
import { Phone } from "@phosphor-icons/react/dist/csr/Phone";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type { SiteBrief } from "@/lib/sites/design-plan";

const WhatsAppChatModal = dynamic(
  () => import("@/components/crm/whatsapp-chat").then((mod) => mod.WhatsAppChatModal),
  { ssr: false },
);
import {
  PIPELINE_COLUMNS,
  columnForStatus,
  formatDate,
  formatMoney,
  leadScore,
  leadTier,
  tierLabel,
  toBrazilianWhatsAppNumber,
  toLocalDateTime,
} from "@/lib/crm/pipeline";
import type { CrmLead, LeadStatus } from "@/lib/crm/types";

type TabId =
  | "info"
  | "notes"
  | "scripts"
  | "objections"
  | "site"
  | "sale"
  | "schedule";

const TABS: { id: TabId; label: string }[] = [
  { id: "info", label: "Informações" },
  { id: "notes", label: "Notas" },
  { id: "scripts", label: "Roteiros" },
  { id: "objections", label: "Objeções" },
  { id: "site", label: "Site" },
  { id: "sale", label: "Venda" },
  { id: "schedule", label: "Agendar" },
];

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

async function patchLead(
  lead: CrmLead,
  patch: {
    status?: LeadStatus;
    notes?: string | null;
    estimatedValue?: number | null;
    followUpAt?: string | null;
  },
) {
  const response = await fetch(`/api/v1/leads/${lead.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: patch.status ?? lead.status,
      notes: patch.notes !== undefined ? patch.notes : lead.notes,
      estimatedValue:
        patch.estimatedValue !== undefined ? patch.estimatedValue : lead.estimated_value,
      followUpAt: patch.followUpAt !== undefined ? patch.followUpAt : lead.follow_up_at,
    }),
  });
  const payload = (await response.json()) as {
    lead?: Partial<CrmLead>;
    error?: { message?: string };
  };
  if (!response.ok || !payload.lead) {
    throw new Error(payload.error?.message ?? "Não foi possível salvar.");
  }
  return payload.lead;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-black/[0.06] py-4 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-6">
      <dt className="text-sm text-[var(--text-4)]">{label}</dt>
      <dd className="text-sm font-medium text-[var(--text)]">{children}</dd>
    </div>
  );
}

function EmptyTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-[var(--neu-bg-pop)] px-5 py-12 text-center">
      <p className="font-semibold text-[var(--text-2)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-4)]">{body}</p>
    </div>
  );
}

export function LeadDetailView({
  lead: initialLead,
  siblingIds,
  demoMode = false,
}: {
  lead: CrmLead;
  siblingIds: number[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [tab, setTab] = useState<TabId>("info");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [estimatedValue, setEstimatedValue] = useState(lead.estimated_value?.toString() ?? "");
  const [followUpAt, setFollowUpAt] = useState(toLocalDateTime(lead.follow_up_at));
  const [siteBusy, setSiteBusy] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [brief, setBrief] = useState(lead.site_brief);
  const [copied, setCopied] = useState(false);
  const [diagnosisBusy, setDiagnosisBusy] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState(lead.ai_diagnosis);
  const [outreach, setOutreach] = useState(lead.ai_outreach);
  const [outreachCopied, setOutreachCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const score = leadScore(lead);
  const tier = leadTier(score);
  const column = columnForStatus(lead.status);
  const whatsapp = toBrazilianWhatsAppNumber(lead.phone);
  const index = siblingIds.indexOf(lead.id);
  const position = index >= 0 ? index + 1 : 1;
  const total = Math.max(siblingIds.length, 1);

  const dealStatus: "open" | "won" | "lost" =
    lead.status === "won" ? "won" : lead.status === "lost" ? "lost" : "open";

  const siteLabel = useMemo(() => {
    if (lead.website_url) return lead.website_url;
    if (lead.site_status === "published") return "Site publicado no Briaspas";
    if (lead.site_status === "ready") return "Site pronto para publicar";
    if (lead.site_status === "generating") return "Gerando...";
    return "Sem site";
  }, [lead.website_url, lead.site_status]);

  async function applyStatus(next: LeadStatus) {
    if (next === lead.status) return;
    setSaving(true);
    setError(null);
    const previous = lead.status;
    setLead((current) => ({ ...current, status: next }));
    if (demoMode) {
      setSaving(false);
      return;
    }
    try {
      const updated = await patchLead(lead, { status: next });
      setLead((current) => ({ ...current, ...updated, status: next }));
    } catch (err) {
      setLead((current) => ({ ...current, status: previous }));
      setError(err instanceof Error ? err.message : "Não foi possível atualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function applyDealStatus(next: "open" | "won" | "lost") {
    if (next === "won") return applyStatus("won");
    if (next === "lost") return applyStatus("lost");
    if (dealStatus === "open") return;
    return applyStatus("contacted");
  }

  async function saveNotes(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!demoMode) {
        const updated = await patchLead(lead, { notes: notes.trim() || null });
        setLead((current) => ({ ...current, ...updated, notes: notes.trim() || null }));
      } else {
        setLead((current) => ({ ...current, notes: notes.trim() || null }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as notas.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSale(event: FormEvent) {
    event.preventDefault();
    const numericValue =
      estimatedValue.trim() === "" ? null : Number(estimatedValue.replace(",", "."));
    if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0)) {
      setError("Informe um valor de venda válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!demoMode) {
        const updated = await patchLead(lead, { estimatedValue: numericValue });
        setLead((current) => ({ ...current, ...updated, estimated_value: numericValue }));
      } else {
        setLead((current) => ({ ...current, estimated_value: numericValue }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a venda.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSchedule(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const iso = followUpAt ? new Date(followUpAt).toISOString() : null;
    try {
      if (!demoMode) {
        const updated = await patchLead(lead, { followUpAt: iso });
        setLead((current) => ({ ...current, ...updated, follow_up_at: iso }));
      } else {
        setLead((current) => ({ ...current, follow_up_at: iso }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o agendamento.");
    } finally {
      setSaving(false);
    }
  }

  async function generateBrief() {
    setSiteBusy(true);
    setSiteError(null);
    try {
      const response = await fetch(`/api/v1/leads/${lead.id}/generate-brief`, { method: "POST" });
      const payload = (await response.json()) as {
        data?: { brief?: SiteBrief };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.brief) {
        throw new Error(payload.error?.message ?? "Não foi possível gerar o briefing.");
      }
      setBrief(payload.data.brief);
      setLead((current) => ({ ...current, site_brief: payload.data!.brief! }));
    } catch (err) {
      setSiteError(err instanceof Error ? err.message : "Não foi possível gerar o briefing.");
    } finally {
      setSiteBusy(false);
    }
  }

  async function uploadSite(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setSiteBusy(true);
    setSiteError(null);
    try {
      const formData = new FormData();
      formData.set("site", file);
      const response = await fetch(`/api/v1/leads/${lead.id}/site-upload`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        data?: { site_status?: CrmLead["site_status"]; site_source?: CrmLead["site_source"] };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.site_status) {
        throw new Error(payload.error?.message ?? "Não foi possível enviar o ZIP.");
      }
      setLead((current) => ({
        ...current,
        site_status: payload.data!.site_status!,
        site_source: payload.data!.site_source ?? "uploaded",
      }));
    } catch (err) {
      setSiteError(err instanceof Error ? err.message : "Não foi possível enviar o ZIP.");
    } finally {
      setSiteBusy(false);
    }
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
      const payload = (await response.json()) as {
        data?: { site_status?: CrmLead["site_status"] };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.site_status) {
        throw new Error(payload.error?.message ?? "Não foi possível atualizar a publicação.");
      }
      setLead((current) => ({ ...current, site_status: payload.data!.site_status! }));
    } catch (err) {
      setSiteError(err instanceof Error ? err.message : "Não foi possível atualizar a publicação.");
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
      const payload = (await response.json()) as {
        data?: { url?: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.url) {
        throw new Error(payload.error?.message ?? "Não foi possível abrir a pré-visualização.");
      }
      if (previewWindow) previewWindow.location.href = payload.data.url;
      else window.location.href = payload.data.url;
    } catch (err) {
      previewWindow?.close();
      setSiteError(err instanceof Error ? err.message : "Não foi possível abrir a pré-visualização.");
    } finally {
      setSiteBusy(false);
    }
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
      const payload = (await response.json()) as {
        data?: { diagnosis?: CrmLead["ai_diagnosis"]; outreach?: CrmLead["ai_outreach"] };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.diagnosis) {
        throw new Error(payload.error?.message ?? "Não foi possível gerar o diagnóstico.");
      }
      setDiagnosis(payload.data.diagnosis);
      setOutreach(payload.data.outreach ?? null);
      setLead((current) => ({
        ...current,
        ai_diagnosis: payload.data!.diagnosis!,
        ai_outreach: payload.data!.outreach ?? null,
      }));
    } catch (err) {
      setDiagnosisError(err instanceof Error ? err.message : "Não foi possível gerar o diagnóstico.");
    } finally {
      setDiagnosisBusy(false);
    }
  }

  async function deleteLead() {
    if (!window.confirm("Remover este lead e todos os dados e sites vinculados?")) return;
    if (demoMode) {
      router.push("/preview/crm");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/v1/leads/${lead.id}`, { method: "DELETE" });
    if (response.ok) router.push("/app/crm");
    else {
      setError("Não foi possível remover este lead.");
      setSaving(false);
    }
  }

  function goSibling(delta: number) {
    if (siblingIds.length === 0) return;
    const current = index >= 0 ? index : 0;
    const next = (current + delta + siblingIds.length) % siblingIds.length;
    router.push(`${demoMode ? "/preview/crm" : "/app/crm"}/${siblingIds[next]}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={demoMode ? "/preview/crm" : "/app/crm"}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-3)] hover:text-[var(--brand)]"
        >
          <ArrowLeft size={16} /> CRM{" "}
          <span className="text-[var(--text-5)]">/</span>{" "}
          <span className="text-[var(--text)]">{lead.company_name}</span>
        </Link>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-sm tabular-nums text-[var(--text-4)]">
            {position}/{total}
          </span>
          <button
            type="button"
            onClick={() => goSibling(-1)}
            disabled={siblingIds.length < 2}
            className="grid size-9 place-items-center rounded-xl border border-black/8 bg-white text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] disabled:opacity-40"
            aria-label="Lead anterior"
          >
            <CaretLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => goSibling(1)}
            disabled={siblingIds.length < 2}
            className="grid size-9 place-items-center rounded-xl border border-black/8 bg-white text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] disabled:opacity-40"
            aria-label="Próximo lead"
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={`grid size-12 place-items-center rounded-full text-base font-bold text-white ${
            score >= 70 ? "bg-[#1A7E3A]" : score >= 45 ? "bg-[#34C759]" : "bg-[#8E8E93]"
          }`}
        >
          {score}
        </span>
        {(tier === "quente" || tier === "morno") && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              tier === "quente" ? "bg-[#E8F8EE] text-[#1A7E3A]" : "bg-[#FFF4E5] text-[#B25E00]"
            }`}
          >
            {tierLabel(tier)}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          {lead.company_name}
        </h1>
      </div>

      <section className="app-card mt-6 overflow-hidden p-0">
        <div className="flex gap-1 overflow-x-auto border-b border-black/[0.06] px-3 pt-2 sm:px-5">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative shrink-0 px-3 py-3 text-sm font-semibold transition-colors ${
                  active ? "text-[var(--brand)]" : "text-[var(--text-4)] hover:text-[var(--text-2)]"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--brand)]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-7">
          {error && (
            <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {tab === "info" && (
            <dl>
              <InfoRow label="Categoria">{lead.niche ?? "—"}</InfoRow>
              <InfoRow label="Cidade">{lead.city ?? "—"}</InfoRow>
              <InfoRow label="Telefone">
                {lead.phone ? (
                  <span className="inline-flex flex-wrap items-center gap-3">
                    {lead.phone}
                    <a
                      href={`tel:${lead.phone.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--brand)] hover:underline"
                    >
                      <Phone size={14} /> Ligar
                    </a>
                    {whatsapp && (
                      <button
                        type="button"
                        onClick={() => setChatOpen(true)}
                        className="font-semibold text-emerald-700 hover:underline"
                      >
                        WhatsApp
                      </button>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Endereço">{lead.address ?? "—"}</InfoRow>
              <InfoRow label="Avaliação">
                {lead.rating != null
                  ? `${lead.rating.toFixed(1)}/5${
                      lead.review_count != null
                        ? ` · ${lead.review_count} avaliações`
                        : ""
                    }`
                  : "—"}
              </InfoRow>
              <InfoRow label="Etapa">
                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_COLUMNS.map((item) => {
                    const active = item.id === column.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={saving}
                        onClick={() => void applyStatus(item.dropStatus)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "bg-[var(--brand)] text-white"
                            : "bg-[var(--neu-bg-well)] text-[var(--text-3)] hover:bg-[var(--neu-bg-pop)]"
                        }`}
                      >
                        {item.title}
                      </button>
                    );
                  })}
                </div>
              </InfoRow>
              <InfoRow label="Google Meu Negócio">
                {lead.google_maps_url ? (
                  <a
                    href={lead.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/8 px-3 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)]"
                  >
                    Ver no Google <ArrowSquareOut size={14} />
                  </a>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Status">
                <div className="inline-flex rounded-xl bg-[var(--neu-bg-well)] p-1">
                  {(
                    [
                      { id: "open", label: "Em aberto" },
                      { id: "won", label: "Ganho" },
                      { id: "lost", label: "Perdido" },
                    ] as const
                  ).map((item) => {
                    const active = dealStatus === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={saving}
                        onClick={() => void applyDealStatus(item.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "bg-[var(--text)] text-white shadow-sm"
                            : "text-[var(--text-3)] hover:text-[var(--text)]"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </InfoRow>
              <InfoRow label="Site">
                <span className={siteLabel === "Sem site" ? "text-[var(--text-4)]" : undefined}>
                  {siteLabel}
                </span>
              </InfoRow>
            </dl>
          )}

          {tab === "notes" && (
            <form onSubmit={saveNotes} className="space-y-4">
              <label className="block text-sm text-[var(--text-3)]">
                Anotações
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={8}
                  maxLength={10000}
                  placeholder="O que foi conversado com este lead?"
                  className="mt-2 w-full resize-y rounded-2xl border border-black/8 bg-[var(--neu-bg-pop)] px-4 py-3 text-sm leading-6 text-[var(--text)]"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-60"
              >
                <Check size={15} weight="bold" /> {saving ? "Salvando..." : "Salvar notas"}
              </button>
            </form>
          )}

          {tab === "scripts" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={diagnosisBusy || demoMode}
                  onClick={() => void generateDiagnosis()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-60"
                >
                  <Sparkle size={15} weight="fill" />
                  {diagnosisBusy ? "Gerando..." : diagnosis ? "Regenerar diagnóstico" : "Gerar diagnóstico + copy"}
                </button>
                {outreach?.mensagem && (
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(outreach.mensagem!);
                      setOutreachCopied(true);
                      window.setTimeout(() => setOutreachCopied(false), 1800);
                    }}
                    className="rounded-xl border border-black/8 px-3 py-2 text-sm font-semibold text-[var(--text-2)]"
                  >
                    {outreachCopied ? "Copiado" : "Copiar abordagem"}
                  </button>
                )}
              </div>
              {diagnosisError && <p className="text-sm text-rose-600">{diagnosisError}</p>}
              {diagnosis?.dorPrincipal ? (
                <div className="space-y-3 text-sm leading-6 text-[var(--text-2)]">
                  <p>
                    <strong>Dor:</strong> {diagnosis.dorPrincipal}
                  </p>
                  {diagnosis.resumo && <p className="text-[var(--text-3)]">{diagnosis.resumo}</p>}
                  {outreach?.mensagem && (
                    <pre className="whitespace-pre-wrap rounded-2xl bg-[var(--neu-bg-pop)] p-4 text-[var(--text-3)]">
                      {outreach.mensagem}
                    </pre>
                  )}
                </div>
              ) : (
                <EmptyTab
                  title="Roteiros de abordagem"
                  body="Gere um diagnóstico com copy de WhatsApp para este lead. O histórico existente aparece aqui automaticamente."
                />
              )}
            </div>
          )}

          {tab === "objections" && (
            <EmptyTab
              title="Objeções"
              body="Em breve: banco de respostas para objeções comuns (preço, timing, já tenho site)."
            />
          )}

          {tab === "site" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--brand)]/15 bg-[var(--brand-hover)]/[0.055] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)]">
                    <GlobeHemisphereWest size={16} /> Site personalizado
                  </p>
                  <span className="text-xs text-[var(--text-4)]">
                    {lead.site_status === "not_generated" && "Sem site enviado"}
                    {lead.site_status === "generating" && "Processando..."}
                    {lead.site_status === "ready" && "Pronto para publicar"}
                    {lead.site_status === "failed" && "Falhou"}
                    {lead.site_status === "published" && "Publicado"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={siteBusy || demoMode}
                    onClick={() => void generateBrief()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)]/20 px-3 py-2 text-xs font-semibold text-[var(--brand)] disabled:opacity-60"
                  >
                    <MagicWand size={14} weight="fill" />{" "}
                    {siteBusy ? "Gerando..." : brief ? "Regenerar briefing" : "Gerar briefing"}
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/8 px-3 py-2 text-xs font-semibold text-[var(--text-2)]">
                    Enviar ZIP
                    <input
                      type="file"
                      accept=".zip,application/zip"
                      className="sr-only"
                      disabled={siteBusy || demoMode}
                      onChange={uploadSite}
                    />
                  </label>
                  {lead.site_source === "uploaded" && lead.site_status === "ready" && (
                    <button
                      type="button"
                      disabled={siteBusy}
                      onClick={() => void previewSite()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)]/20 px-3 py-2 text-xs font-semibold text-[var(--brand)]"
                    >
                      <Eye size={14} /> Pré-visualizar
                    </button>
                  )}
                  {lead.site_status === "ready" && (
                    <button
                      type="button"
                      disabled={siteBusy}
                      onClick={() => void changePublication("publish")}
                      className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Publicar
                    </button>
                  )}
                  {lead.site_status === "published" && (
                    <>
                      <Link
                        href={`/empresa/${lead.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--brand)]/20 px-3 py-2 text-xs font-semibold text-[var(--brand)]"
                      >
                        Ver site <ArrowSquareOut size={13} />
                      </Link>
                      <button
                        type="button"
                        disabled={siteBusy}
                        onClick={() => void changePublication("unpublish")}
                        className="rounded-xl border border-black/8 px-3 py-2 text-xs font-semibold text-[var(--text-3)]"
                      >
                        Despublicar
                      </button>
                    </>
                  )}
                </div>
                {siteError && <p className="mt-2 text-xs text-rose-600">{siteError}</p>}
                {brief && (
                  <div className="mt-4 space-y-2 border-t border-[var(--brand)]/15 pt-4 text-xs text-[var(--text-2)]">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[var(--brand)]">Briefing</p>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(briefingText(brief));
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1800);
                        }}
                        className="text-[var(--brand)]"
                      >
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <p>{brief.resumoDoNegocio}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "sale" && (
            <form onSubmit={saveSale} className="max-w-md space-y-4">
              <label className="block text-sm text-[var(--text-3)]">
                Valor da venda
                <input
                  value={estimatedValue}
                  onChange={(event) => setEstimatedValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 600,00"
                  className="mt-2 w-full rounded-2xl border border-black/8 bg-[var(--neu-bg-pop)] px-4 py-3 text-sm"
                />
              </label>
              {formatMoney(lead.estimated_value) && (
                <p className="text-sm text-[var(--text-4)]">
                  Atual: <strong className="text-[var(--text)]">{formatMoney(lead.estimated_value)}</strong>
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar valor"}
              </button>
            </form>
          )}

          {tab === "schedule" && (
            <div className="space-y-5">
              <form onSubmit={saveSchedule} className="max-w-md space-y-4">
                <label className="block text-sm text-[var(--text-3)]">
                  Próximo contato / follow-up
                  <input
                    type="datetime-local"
                    value={followUpAt}
                    onChange={(event) => setFollowUpAt(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-black/8 bg-[var(--neu-bg-pop)] px-4 py-3 text-sm"
                  />
                </label>
                {lead.follow_up_at && (
                  <p className="text-sm text-[var(--text-4)]">
                    Agendado para {formatDate(lead.follow_up_at)}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar retorno"}
                </button>
              </form>
              <Link
                href="/app/agendamentos"
                className="inline-flex text-sm font-semibold text-[var(--brand)] hover:underline"
              >
                Abrir painel de Agendamentos
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void deleteLead()}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-400/10"
        >
          <Trash size={15} /> Remover lead
        </button>
      </div>

      <WhatsAppChatModal
        leadId={lead.id}
        companyName={lead.company_name}
        phone={lead.phone}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </main>
  );
}

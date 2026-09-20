"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ChatCircleDots } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { GlobeHemisphereWest } from "@phosphor-icons/react/dist/csr/GlobeHemisphereWest";
import { MagicWand } from "@phosphor-icons/react/dist/csr/MagicWand";
import { MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { Phone } from "@phosphor-icons/react/dist/csr/Phone";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Target } from "@phosphor-icons/react/dist/csr/Target";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useMemo, useState } from "react";
import type { SiteBrief } from "@/lib/sites/design-plan";

const WhatsAppChatModal = dynamic(
  () => import("@/components/crm/whatsapp-chat").then((mod) => mod.WhatsAppChatModal),
  { ssr: false },
);
import { CommercialPotentialIndicator } from "@/components/crm/commercial-potential-indicator";
import {
  PIPELINE_COLUMNS,
  columnForStatus,
  formatDate,
  formatMoney,
  leadScore,
  toBrazilianWhatsAppNumber,
  toLocalDateTime,
} from "@/lib/crm/pipeline";
import type { CrmLead, LeadStatus } from "@/lib/crm/types";
import type { LeadNeighbors } from "@/lib/pagination/lead-neighbors";
import { LeadOutreachPanel } from "@/components/crm/lead-outreach-panel";

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

const DEFAULT_OBJECTIONS = [
  {
    objecao: "Está caro ou não tenho orçamento agora",
    resposta: "Faz sentido. Antes de falar de investimento, posso mostrar em poucos minutos a oportunidade que observei e você decide se vale avançar.",
  },
  {
    objecao: "Já tenho site ou alguém cuida disso",
    resposta: "Perfeito. A ideia não é substituir nada sem contexto; posso mostrar a prévia e você avalia se complementa o que já existe.",
  },
  {
    objecao: "Me manda por mensagem",
    resposta: "Claro. Vou enviar um resumo objetivo da oportunidade e, se fizer sentido, marcamos uma conversa curta depois.",
  },
] as const;

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
    <div className="grid gap-1 border-b border-[var(--border)] py-4 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-6">
      <dt className="text-sm text-[var(--text-4)]">{label}</dt>
      <dd className="text-sm font-medium text-[var(--text)]">{children}</dd>
    </div>
  );
}

function EmptyTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--neu-bg-pop)] px-5 py-12 text-center">
      <p className="font-semibold text-[var(--text-2)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-4)]">{body}</p>
    </div>
  );
}

export function LeadDetailView({
  lead: initialLead,
  siblingIds,
  neighbors,
  demoMode = false,
}: {
  lead: CrmLead;
  /** @deprecated Prefer `neighbors` — avoids loading every lead id. */
  siblingIds?: number[];
  neighbors?: LeadNeighbors;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [tab, setTab] = useState<TabId>("info");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [estimatedValue, setEstimatedValue] = useState(lead.estimated_value?.toString() ?? "");
  const [followUpAt, setFollowUpAt] = useState(toLocalDateTime(lead.follow_up_at));
  const [siteAction, setSiteAction] = useState<
    null | "brief" | "upload" | "publish" | "unpublish" | "preview"
  >(null);
  const siteBusy = siteAction !== null;
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
  const column = columnForStatus(lead.status);
  const whatsapp = toBrazilianWhatsAppNumber(lead.phone);
  const siblingIndex = siblingIds?.indexOf(lead.id) ?? -1;
  const position = neighbors?.position ?? (siblingIndex >= 0 ? siblingIndex + 1 : 1);
  const total = neighbors?.total ?? Math.max(siblingIds?.length ?? 0, 1);
  const canNavigate =
    neighbors != null
      ? Boolean(neighbors.prevId || neighbors.nextId)
      : (siblingIds?.length ?? 0) >= 2;
  const objectionResponses = outreach?.objecoesAntecipadas?.length
    ? outreach.objecoesAntecipadas
    : DEFAULT_OBJECTIONS;

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
    setSiteAction("brief");
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
      setSiteAction(null);
    }
  }

  async function uploadSite(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setSiteAction("upload");
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
      setSiteAction(null);
    }
  }

  async function changePublication(action: "publish" | "unpublish") {
    setSiteAction(action);
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
      setSiteAction(null);
    }
  }

  async function previewSite() {
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    setSiteAction("preview");
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
      setSiteAction(null);
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
    if (!window.confirm("Mover este lead para a lixeira? Você poderá restaurá-lo depois.")) return;
    if (demoMode) {
      router.push("/preview/crm");
      return;
    }
    setDeleting(true);
    const response = await fetch(`/api/v1/leads/${lead.id}`, { method: "DELETE" });
    if (response.ok) router.push("/app/crm");
    else {
      setError("Não foi possível mover este lead para a lixeira.");
      setDeleting(false);
    }
  }

  function goSibling(delta: number) {
    const base = demoMode ? "/preview/crm" : "/app/crm";
    if (neighbors) {
      const target = delta < 0 ? neighbors.prevId : neighbors.nextId;
      if (target != null) router.push(`${base}/${target}`);
      return;
    }
    if (!siblingIds || siblingIds.length === 0) return;
    const current = siblingIndex >= 0 ? siblingIndex : 0;
    const next = (current + delta + siblingIds.length) % siblingIds.length;
    router.push(`${base}/${siblingIds[next]}`);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TABS.length - 1;
    if (nextIndex == null) return;

    event.preventDefault();
    const nextTab = TABS[nextIndex];
    setTab(nextTab.id);
    window.requestAnimationFrame(() => document.getElementById(`lead-tab-${nextTab.id}`)?.focus());
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
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
            disabled={neighbors ? neighbors.prevId == null : !canNavigate}
            className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-40"
            aria-label="Lead anterior"
            title="Lead anterior"
          >
            <CaretLeft size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goSibling(1)}
            disabled={neighbors ? neighbors.nextId == null : !canNavigate}
            className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-40"
            aria-label="Próximo lead"
            title="Próximo lead"
          >
            <CaretRight size={16} aria-hidden />
          </button>
        </div>
      </div>

      <section className="mt-5 flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <div
            className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--neu-bg-well)] text-base font-bold tabular-nums text-[var(--text)]"
            aria-label={`Potencial comercial: ${score}%`}
          >
            {score}
          </div>
          <div className="min-w-0">
            <h1 className="text-balance truncate text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              {lead.company_name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-3)]">
              <span>{lead.niche ?? "Sem categoria"}</span>
              {lead.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} aria-hidden /> {lead.city}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {lead.phone && (
            <a
              href={`tel:${lead.phone.replace(/\D/g, "")}`}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-3.5 text-sm font-semibold text-[var(--text-2)] transition-[background-color,transform] duration-150 hover:bg-[var(--neu-bg-well)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <Phone size={16} aria-hidden /> Ligar
            </a>
          )}
          {whatsapp && (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-solid)] px-3.5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[var(--brand-solid-hover)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <ChatCircleDots size={16} aria-hidden /> WhatsApp
            </button>
          )}
        </div>
      </section>

      <section className="app-card mt-6 overflow-hidden p-0">
        <div
          className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-3 pt-2 sm:px-5"
          role="tablist"
          aria-label="Seções do lead"
        >
          {TABS.map((item, index) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`lead-tab-${item.id}`}
                aria-selected={active}
                aria-controls={`lead-panel-${item.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(item.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={`relative min-h-11 shrink-0 px-3 py-3 text-sm font-semibold transition-[color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                  active ? "text-[var(--brand)]" : "text-[var(--text-4)] hover:text-[var(--text-2)]"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--brand-solid)]" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        <div
          className="p-5 sm:p-7"
          role="tabpanel"
          id={`lead-panel-${tab}`}
          aria-labelledby={`lead-tab-${tab}`}
        >
          {error && (
            <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {tab === "info" && (
            <>
              <section
                className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] p-4 sm:p-5"
                aria-labelledby="lead-resumo-heading"
              >
                <h2 id="lead-resumo-heading" className="text-base font-semibold text-[var(--text)]">
                  Resumo
                </h2>
                <CommercialPotentialIndicator
                  className="mt-3"
                  score={score}
                  variant="detail"
                  showBar
                  showTooltip
                />
              </section>
              <LeadOutreachPanel lead={lead} demoMode={demoMode} />
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
                        className="font-semibold text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                        aria-label={`Abrir chat WhatsApp de ${lead.company_name}`}
                        title="Abrir conversa WhatsApp"
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
                        aria-pressed={active}
                        title={`Definir etapa: ${item.title}`}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                          active
                            ? "bg-[var(--brand-solid)] text-white"
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)]"
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
                        aria-pressed={active}
                        title={`Marcar negócio como ${item.label}`}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
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
            </>
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
                  className="mt-2 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-4 py-3 text-sm leading-6 text-[var(--text)]"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-solid)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-solid-hover)] disabled:opacity-60"
              >
                <Check size={15} weight="bold" /> {saving ? "Salvando..." : "Salvar notas"}
              </button>
            </form>
          )}

          {tab === "scripts" && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--brand)]/15 bg-[var(--brand-hover)]/[0.055] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-[var(--text)]">
                    <Target size={17} className="text-[var(--brand)]" aria-hidden /> Inteligência de abordagem
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-3)]">Dores observadas, copy e CTA com base apenas nos dados disponíveis.</p>
                </div>
                <button
                  type="button"
                  disabled={diagnosisBusy || demoMode}
                  onClick={() => void generateDiagnosis()}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-solid)] px-3.5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[var(--brand-solid-hover)] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                >
                  <Sparkle size={15} weight="fill" />
                  {diagnosisBusy ? "Gerando… pode levar ~30s" : diagnosis ? "Regenerar diagnóstico" : "Gerar diagnóstico + copy"}
                </button>
              </div>
              {diagnosisBusy && (
                <p className="text-sm text-[var(--text-4)]" role="status">
                  Analisando o lead com IA. Mantenha esta aba aberta.
                </p>
              )}
              {diagnosisError && <p role="alert" className="text-sm text-rose-600">{diagnosisError}</p>}

              {diagnosis?.dorPrincipal ? (
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <section className="rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] p-4 sm:p-5" aria-labelledby="diagnostico-heading">
                    <h3 id="diagnostico-heading" className="text-sm font-semibold text-[var(--text)]">Dores e oportunidade</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-[var(--text)]">{diagnosis.dorPrincipal}</p>
                    {diagnosis.resumo && <p className="mt-3 text-sm leading-6 text-[var(--text-3)]">{diagnosis.resumo}</p>}
                    {diagnosis.doresSecundarias?.length ? (
                      <ul className="mt-4 space-y-2 text-sm text-[var(--text-3)]">
                        {diagnosis.doresSecundarias.map((pain) => <li key={pain}>• {pain}</li>)}
                      </ul>
                    ) : null}
                    {diagnosis.oportunidades?.length ? (
                      <div className="mt-5 border-t border-[var(--border)] pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-4)]">Oportunidade</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-2)]">{diagnosis.oportunidades[0]}</p>
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-5" aria-labelledby="copy-heading">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 id="copy-heading" className="text-sm font-semibold text-[var(--text)]">Mensagem de abordagem</h3>
                        <p className="mt-1 text-xs text-[var(--text-4)]">A mensagem começa pelo gancho; os primeiros 40 caracteres já apresentam a oportunidade.</p>
                      </div>
                      {outreach?.mensagem && (
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(outreach.mensagem!);
                            setOutreachCopied(true);
                            window.setTimeout(() => setOutreachCopied(false), 1800);
                          }}
                          className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text-2)] transition-[background-color,transform] duration-150 hover:bg-[var(--neu-bg-pop)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                        >
                          {outreachCopied ? "Copiado" : "Copiar mensagem"}
                        </button>
                      )}
                    </div>
                    {outreach?.gancho && (
                      <p className="mt-4 rounded-xl border border-[var(--brand)]/15 bg-[var(--brand-hover)]/[0.055] px-3 py-2 text-sm font-semibold leading-6 text-[var(--brand)]">
                        {outreach.gancho}
                      </p>
                    )}
                    {outreach?.mensagem ? (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-2)]">{outreach.mensagem}</p>
                    ) : (
                      <p className="mt-4 text-sm leading-6 text-[var(--text-4)]">Gere o diagnóstico para criar uma mensagem específica para este negócio.</p>
                    )}
                    {outreach?.cta && <p className="mt-4 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-3)]"><strong className="text-[var(--text)]">CTA:</strong> {outreach.cta}</p>}
                  </section>
                </div>
              ) : (
                <EmptyTab
                  title="Descubra onde a abordagem pode ser mais relevante"
                  body="Gere o diagnóstico para ver a dor principal, as oportunidades observadas e uma mensagem pronta para WhatsApp."
                />
              )}
            </div>
          )}

          {tab === "objections" && (
            <section aria-labelledby="objecoes-heading">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="objecoes-heading" className="text-base font-semibold text-[var(--text)]">Respostas para objeções</h2>
                  <p className="mt-1 text-sm text-[var(--text-3)]">Use como guia e adapte ao que a pessoa realmente disser.</p>
                </div>
                {outreach?.objecoesAntecipadas?.length ? <span className="text-xs font-semibold text-[var(--brand)]">Sugestões geradas para este lead</span> : null}
              </div>
              <div className="mt-5 space-y-3">
                {objectionResponses.map((item) => (
                  <article key={item.objecao} className="rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] p-4 transition-[box-shadow,transform] duration-150 hover:shadow-[0_6px_18px_rgba(15,23,42,0.05)] motion-reduce:transition-none">
                    <h3 className="text-sm font-semibold text-[var(--text)]">“{item.objecao}”</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-3)]">{item.resposta}</p>
                  </article>
                ))}
              </div>
            </section>
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
                <div className="mt-3 flex flex-wrap gap-2" aria-busy={siteBusy}>
                  {siteBusy && (
                    <p className="w-full text-xs font-medium text-[var(--brand)]" role="status">
                      {siteAction === "brief" && "Gerando briefing…"}
                      {siteAction === "upload" && "Enviando ZIP…"}
                      {siteAction === "publish" && "Publicando site…"}
                      {siteAction === "unpublish" && "Despublicando…"}
                      {siteAction === "preview" && "Abrindo pré-visualização…"}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={siteBusy || demoMode}
                    onClick={() => void generateBrief()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)]/20 px-3 py-2 text-xs font-semibold text-[var(--brand)] disabled:opacity-60"
                  >
                    <MagicWand size={14} weight="fill" />{" "}
                    {siteAction === "brief" ? "Gerando…" : brief ? "Regenerar briefing" : "Gerar briefing"}
                  </button>
                  <label
                    className={`inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-2)] ${
                      siteBusy || demoMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    }`}
                  >
                    {siteAction === "upload" ? "Enviando ZIP…" : "Enviar ZIP"}
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
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)]/20 px-3 py-2 text-xs font-semibold text-[var(--brand)] disabled:opacity-60"
                    >
                      <Eye size={14} /> {siteAction === "preview" ? "Abrindo…" : "Pré-visualizar"}
                    </button>
                  )}
                  {lead.site_status === "ready" && (
                    <button
                      type="button"
                      disabled={siteBusy}
                      onClick={() => void changePublication("publish")}
                      className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {siteAction === "publish" ? "Publicando…" : "Publicar"}
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
                        className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-3)] disabled:opacity-60"
                      >
                        {siteAction === "unpublish" ? "Despublicando…" : "Despublicar"}
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
                        className="text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                        aria-label="Copiar briefing do site"
                        title="Copiar para a área de transferência"
                      >
                        {copied ? "Copiado" : "Copiar briefing"}
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
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-4 py-3 text-sm"
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
                className="rounded-xl bg-[var(--brand-solid)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
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
                    className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-4 py-3 text-sm"
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
                  className="rounded-xl bg-[var(--brand-solid)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
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
          disabled={saving || deleting}
          onClick={() => void deleteLead()}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-400/10 disabled:opacity-60"
        >
          <Trash size={15} /> {deleting ? "Movendo…" : "Mover para lixeira"}
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

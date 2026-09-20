"use client";

import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { WhatsappLogo } from "@phosphor-icons/react/dist/csr/WhatsappLogo";
import { useMemo, useState } from "react";
import { appendTimelineEntry } from "@/lib/crm/lead-timeline";
import { appendOutreachHistory, listOutreachHistoryForLead } from "@/lib/crm/outreach-history";
import { buildOutreachMessage } from "@/lib/crm/outreach-template";
import { getPublicSiteOrigin } from "@/lib/crm/public-site-url";
import type { CrmLead } from "@/lib/crm/types";
import { buildWhatsAppDeepLink } from "@/lib/crm/whatsapp-phone";

type LeadOutreachPanelProps = {
  lead: CrmLead;
  demoMode?: boolean;
  onTimelineChange?: () => void;
};

export function LeadOutreachPanel({
  lead,
  demoMode = false,
  onTimelineChange,
}: LeadOutreachPanelProps) {
  const siteOrigin = useMemo(() => getPublicSiteOrigin(), []);
  const [contactName, setContactName] = useState("");
  const [copied, setCopied] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [messageOverride, setMessageOverride] = useState<{ revision: string; text: string } | null>(
    null,
  );

  const assembled = useMemo(
    () =>
      buildOutreachMessage(
        {
          company_name: lead.company_name,
          niche: lead.niche,
          city: lead.city,
          slug: lead.slug,
          site_status: lead.site_status,
          phone: lead.phone,
          contactName: contactName.trim() || null,
        },
        { siteOrigin },
      ),
    [lead, contactName, siteOrigin],
  );

  const templateRevision = `${lead.id}|${contactName}|${lead.site_status}|${assembled.text}`;
  const message =
    messageOverride?.revision === templateRevision ? messageOverride.text : assembled.text;
  const history =
    historyTick >= 0 ? listOutreachHistoryForLead(lead.id) : [];

  const actionsEnabled = assembled.siteReady && !demoMode;
  const whatsappEnabled = actionsEnabled && Boolean(assembled.whatsappDigits);
  const trimmedMessage = message.trim();

  async function onCopy() {
    if (!actionsEnabled || !trimmedMessage) return;
    await navigator.clipboard.writeText(trimmedMessage);
    appendOutreachHistory({
      leadId: lead.id,
      companyName: lead.company_name,
      action: "copy",
      messagePreview: trimmedMessage.slice(0, 160),
    });
    appendTimelineEntry({
      leadId: lead.id,
      kind: "outreach_copy",
      title: "Mensagem copiada",
      detail: trimmedMessage.slice(0, 160),
    });
    onTimelineChange?.();
    setHistoryTick((tick) => tick + 1);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function onOpenWhatsApp() {
    if (!whatsappEnabled || !assembled.whatsappDigits || !trimmedMessage) return;
    const url = buildWhatsAppDeepLink(assembled.whatsappDigits, trimmedMessage);
    window.open(url, "_blank", "noopener,noreferrer");
    appendOutreachHistory({
      leadId: lead.id,
      companyName: lead.company_name,
      action: "whatsapp",
      messagePreview: trimmedMessage.slice(0, 160),
    });
    appendTimelineEntry({
      leadId: lead.id,
      kind: "outreach_whatsapp",
      title: "WhatsApp aberto",
      detail: trimmedMessage.slice(0, 160),
    });
    onTimelineChange?.();
    setHistoryTick((tick) => tick + 1);
  }

  return (
    <section
      className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] p-4 sm:p-5"
      aria-labelledby="lead-outreach-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="lead-outreach-heading" className="text-base font-semibold text-[var(--text)]">
            Mensagem de abordagem
          </h2>
          <p className="mt-1 text-sm text-[var(--text-4)]">
            Template por nicho, sem envio automático. Revise o texto antes de copiar ou abrir no WhatsApp.
          </p>
        </div>
        {assembled.publicSiteUrl && (
          <a
            href={assembled.publicSiteUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 shrink-0 text-sm font-semibold text-[var(--brand)] hover:underline sm:mt-0"
          >
            Ver demo publicado
          </a>
        )}
      </div>

      {!assembled.siteReady && (
        <p role="status" className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-[var(--text-2)]">
          Publique o site na aba Site para liberar o link do demo e os botões de copiar e WhatsApp.
        </p>
      )}

      {assembled.siteReady && !assembled.whatsappDigits && (
        <p role="status" className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-800">
          Telefone inválido para WhatsApp. Corrija o número nas informações do lead antes de abrir o app.
        </p>
      )}

      {demoMode && (
        <p role="status" className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-3)]">
          Modo demonstração: ações de cópia e WhatsApp estão desativadas.
        </p>
      )}

      <label className="mt-4 block text-sm font-medium text-[var(--text-3)]">
        Nome do contato (opcional)
        <input
          type="text"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          maxLength={80}
          placeholder="Ex.: Marina"
          className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
          autoComplete="name"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-[var(--text-3)]">
        Mensagem
        <textarea
          value={message}
          onChange={(event) =>
            setMessageOverride({ revision: templateRevision, text: event.target.value })
          }
          rows={7}
          maxLength={2000}
          className="mt-1.5 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6 text-[var(--text)]"
          aria-describedby="lead-outreach-hint"
        />
      </label>
      <p id="lead-outreach-hint" className="mt-1 text-xs text-[var(--text-4)]">
        Você pode editar o texto antes de enviar. Nada é disparado automaticamente.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onCopy()}
          disabled={!actionsEnabled || !trimmedMessage}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          <Copy size={16} aria-hidden />
          {copied ? "Copiado" : "Copiar mensagem"}
        </button>
        <button
          type="button"
          onClick={onOpenWhatsApp}
          disabled={!whatsappEnabled || !trimmedMessage}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          aria-label={`Abrir WhatsApp do celular para ${lead.company_name}`}
        >
          <WhatsappLogo size={18} weight="fill" aria-hidden />
          Abrir no WhatsApp
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-4)]">
            Uso nesta sessão
          </h3>
          <ul className="mt-2 space-y-2">
            {history.slice(0, 5).map((entry) => (
              <li key={entry.usedAt} className="text-xs text-[var(--text-3)]">
                <span className="font-medium text-[var(--text-2)]">
                  {entry.action === "copy" ? "Copiado" : "WhatsApp aberto"}
                </span>
                {" · "}
                {new Date(entry.usedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                <p className="mt-0.5 line-clamp-2 text-[var(--text-4)]">{entry.messagePreview}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

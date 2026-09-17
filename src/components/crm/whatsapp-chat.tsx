"use client";

import { ChatCircleDots } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { Robot } from "@phosphor-icons/react/dist/csr/Robot";
import { User } from "@phosphor-icons/react/dist/csr/User";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { FormEvent, useEffect, useState } from "react";
import { SkeletonBar, Spinner } from "@/components/ui/async-feedback";

type WhatsAppMessage = {
  id: number;
  direction: "inbound" | "outbound";
  body: string;
  status: string;
  created_at: string;
};

type WhatsAppConversation = {
  id: number;
  lead_id: number | null;
  wa_contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  agent_enabled: boolean;
  last_message_at: string | null;
};

type WhatsAppChatModalProps = {
  leadId: number;
  companyName: string;
  phone: string | null;
  open: boolean;
  onClose: () => void;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function WhatsAppChatModal({ leadId, companyName, phone, open, onClose }: WhatsAppChatModalProps) {
  const [conversation, setConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stubNote, setStubNote] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      setError(null);
      try {
        const list = await fetch(`/api/v1/integrations/whatsapp/conversations?leadId=${leadId}`);
        const listPayload = (await list.json()) as {
          data?: { conversations?: WhatsAppConversation[] };
          error?: { message?: string };
        };
        if (!list.ok) {
          throw new Error(listPayload.error?.message ?? "Não foi possível carregar a conversa.");
        }
        const existing = listPayload.data?.conversations?.[0] ?? null;
        if (cancelled) return;
        if (!existing) {
          setConversation(null);
          setMessages([]);
          return;
        }
        setConversation(existing);
        const detail = await fetch(`/api/v1/integrations/whatsapp/conversations?conversationId=${existing.id}`);
        const detailPayload = (await detail.json()) as {
          data?: { conversation?: WhatsAppConversation; messages?: WhatsAppMessage[] };
          error?: { message?: string };
        };
        if (!detail.ok) {
          throw new Error(detailPayload.error?.message ?? "Não foi possível carregar as mensagens.");
        }
        if (cancelled) return;
        setConversation(detailPayload.data?.conversation ?? existing);
        setMessages(detailPayload.data?.messages ?? []);
      } catch (fetchError) {
        if (cancelled) return;
        setConversation(null);
        setMessages([]);
        setLoadError(fetchError instanceof Error ? fetchError.message : "Não foi possível carregar a conversa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, leadId, reloadKey]);

  if (!open) return null;

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    setStubNote(null);

    const optimisticId = -Date.now();
    const optimistic: WhatsAppMessage = {
      id: optimisticId,
      direction: "outbound",
      body,
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setText("");

    try {
      const response = await fetch("/api/v1/integrations/whatsapp/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          conversationId: conversation?.id,
          text: body,
        }),
      });
      const payload = (await response.json()) as {
        data?: { conversationId?: number; stubbed?: boolean };
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? "Falha ao enviar.");
      if (payload.data?.stubbed) {
        setStubNote("Meta API não configurada — mensagem enfileirada localmente (stub).");
      }
      const id = payload.data?.conversationId;
      if (id) {
        const detail = await fetch(`/api/v1/integrations/whatsapp/conversations?conversationId=${id}`);
        const detailPayload = (await detail.json()) as {
          data?: { conversation?: WhatsAppConversation; messages?: WhatsAppMessage[] };
        };
        setConversation(detailPayload.data?.conversation ?? null);
        setMessages(detailPayload.data?.messages ?? []);
      } else {
        setMessages((current) =>
          current.map((message) =>
            message.id === optimisticId ? { ...message, status: "sent" } : message,
          ),
        );
      }
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setText(body);
      setError(sendError instanceof Error ? sendError.message : "Falha ao enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function simulateReply() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/integrations/whatsapp/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          conversationId: conversation?.id,
          text: text.trim(),
          simulateInbound: true,
        }),
      });
      const payload = (await response.json()) as {
        data?: { conversationId?: number };
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? "Falha na simulação.");
      setText("");
      const id = payload.data?.conversationId;
      if (id) {
        const detail = await fetch(`/api/v1/integrations/whatsapp/conversations?conversationId=${id}`);
        const detailPayload = (await detail.json()) as {
          data?: { conversation?: WhatsAppConversation; messages?: WhatsAppMessage[] };
        };
        setConversation(detailPayload.data?.conversation ?? null);
        setMessages(detailPayload.data?.messages ?? []);
      }
    } catch (simError) {
      setError(simError instanceof Error ? simError.message : "Falha na simulação.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAgent() {
    if (!conversation || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/v1/integrations/whatsapp/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          agentEnabled: !conversation.agent_enabled,
        }),
      });
      const payload = (await response.json()) as {
        data?: { agent_enabled?: boolean; status?: string };
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(payload.error?.message ?? "Não foi possível atualizar o agente.");
      setConversation((current) =>
        current
          ? {
              ...current,
              agent_enabled: payload.data?.agent_enabled ?? current.agent_enabled,
              status: payload.data?.status ?? current.status,
            }
          : current,
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Não foi possível atualizar o agente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="wa-chat-title">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
        <header className="flex items-start justify-between gap-3 border-b border-black/8 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-emerald-700">WhatsApp</p>
            <h2 id="wa-chat-title" className="mt-0.5 font-semibold text-[var(--text)]">{companyName}</h2>
            <p className="mt-1 text-xs text-[var(--text-4)]">{phone ?? "Sem telefone"} · {conversation?.agent_enabled ? "Agente ligado" : "Agente pausado"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-lg text-[var(--text-3)] hover:bg-[var(--neu-bg-well)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            aria-label="Fechar chat WhatsApp"
            title="Fechar chat WhatsApp"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-black/8 px-4 py-2">
          <button
            type="button"
            disabled={busy || loading || !conversation}
            onClick={toggleAgent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/8 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-well)] disabled:opacity-50"
          >
            <Robot size={14} />
            {conversation?.agent_enabled ? "Pausar agente" : "Ligar agente"}
          </button>
          <button
            type="button"
            disabled={busy || loading || !text.trim()}
            onClick={simulateReply}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            Simular resposta do lead
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto bg-[var(--neu-bg-pop)] px-4 py-4" aria-busy={loading || busy}>
          {loading && (
            <div className="space-y-3" aria-label="Carregando conversa">
              <p className="text-center text-xs font-medium text-[var(--text-4)]">Carregando conversa…</p>
              <SkeletonBar className="ml-auto h-16 w-3/4 rounded-2xl" />
              <SkeletonBar className="h-14 w-2/3 rounded-2xl" />
              <SkeletonBar className="ml-auto h-12 w-1/2 rounded-2xl" />
            </div>
          )}

          {!loading && loadError && (
            <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-4 text-center">
              <p className="text-xs text-rose-700">{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Tentar de novo
              </button>
            </div>
          )}

          {!loading && !loadError && messages.length === 0 && (
            <p className="rounded-xl border border-dashed border-black/10 bg-white/70 px-3 py-6 text-center text-xs text-[var(--text-4)]">
              Nenhuma mensagem ainda. Envie a abordagem ou simule uma resposta do lead.
            </p>
          )}

          {!loading &&
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                    message.direction === "outbound"
                      ? "rounded-br-md bg-emerald-600 text-white"
                      : "rounded-bl-md border border-black/8 bg-white text-[var(--text)]"
                  } ${message.status === "sending" ? "opacity-70" : ""}`}
                >
                  <p className="inline-flex items-center gap-1 text-[10px] opacity-70">
                    {message.direction === "outbound" ? <Robot size={12} /> : <User size={12} />}
                    {message.direction === "outbound" ? "Você / agente" : "Lead"} ·{" "}
                    {message.status === "sending" ? "enviando…" : formatTime(message.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                </div>
              </div>
            ))}
        </div>

        <form onSubmit={send} className="border-t border-black/8 p-3" aria-busy={busy}>
          {error && <p role="alert" className="mb-2 text-xs text-rose-600">{error}</p>}
          {stubNote && <p role="status" className="mb-2 text-xs text-amber-700">{stubNote}</p>}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escreva uma mensagem…"
              maxLength={4000}
              disabled={busy || loading}
              className="h-11 flex-1 rounded-xl border border-black/8 bg-white px-3 text-sm text-[var(--text)] outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || loading || !text.trim()}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? <Spinner className="size-4" /> : <PaperPlaneTilt size={16} weight="fill" />}
              {busy ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WhatsAppControlPanel({
  conversations,
}: {
  conversations: Array<{
    id: number;
    contact_name: string | null;
    contact_phone: string | null;
    agent_enabled: boolean;
    last_message_at: string | null;
    lead_id: number | null;
  }>;
}) {
  return (
    <section className="app-card mt-8 p-4" aria-labelledby="wa-panel-title">
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700">
          <ChatCircleDots size={20} weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="wa-panel-title" className="font-semibold text-[var(--text)]">Painel WhatsApp</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Conversas recentes e status do agente. Abra o chat em um card do funil para responder.
          </p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-black/8">
        {conversations.length === 0 && (
          <li className="py-4 text-sm text-[var(--text-4)]">Nenhuma conversa ainda. Use o botão WhatsApp nos cards.</li>
        )}
        {conversations.slice(0, 8).map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--text)]">{item.contact_name ?? item.contact_phone ?? "Contato"}</p>
              <p className="truncate text-xs text-[var(--text-4)]">{item.contact_phone}</p>
            </div>
            <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${item.agent_enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" : "border-black/8 bg-[var(--neu-bg-well)] text-[var(--text-3)]"}`}>
              {item.agent_enabled ? "Agente on" : "Pausado"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

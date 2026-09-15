import { addCustomDomain, disconnectGoogleCalendar } from "./actions";
import { getCurrentWorkspace } from "@/lib/workspaces/current";

export default async function IntegrationsPage() {
  const { supabase, workspaceId, userId } = await getCurrentWorkspace();
  const [{ data: leads }, { data: domains, error: domainError }, { data: google }] = await Promise.all([
    supabase.from("leads").select("id, company_name, slug").eq("workspace_id", workspaceId).eq("site_status", "published").order("company_name"),
    supabase.from("custom_domains").select("id, hostname, status, verification_error, lead_id").eq("workspace_id", workspaceId),
    supabase.from("google_connections").select("status, google_account_email").eq("user_id", userId).maybeSingle(),
  ]);
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY);
  const vercelConfigured = Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);

  return <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Integrações</h1>
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <section className="app-card p-6"><h2 className="text-xl font-semibold">Domínio personalizado</h2><p className="mt-2 text-sm leading-6 text-[var(--text-3)]">Conecte um domínio à página publicada. O SSL é emitido automaticamente pela Vercel após a validação do DNS.</p>
        {!vercelConfigured && <p className="mt-4 rounded-lg bg-amber-400/10 p-3 text-xs text-amber-800">Credenciais da Vercel ainda não configuradas.</p>}
        {domainError ? <p className="mt-4 text-sm text-amber-700">Aplique a migration de produto para ativar.</p> : <><form action={addCustomDomain} className="mt-5 space-y-3"><select required name="leadId" className="w-full rounded-lg border border-black/5 bg-white px-3 py-2.5"><option value="">Escolha o site publicado</option>{(leads ?? []).map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}</select><input required name="hostname" placeholder="site.suaempresa.com.br" className="w-full rounded-lg border border-black/5 bg-white px-3 py-2.5"/><button className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]">Adicionar domínio</button></form><div className="mt-5 space-y-3">{(domains ?? []).map((domain) => <div key={domain.id} className="rounded-lg bg-[var(--neu-bg-pop)] p-3 text-sm"><div className="flex justify-between gap-3"><span>{domain.hostname}</span><span className="text-[var(--brand)]">{domain.status}</span></div>{domain.verification_error && <p className="mt-2 text-xs leading-5 text-amber-700">{domain.verification_error}</p>}</div>)}</div></>}
      </section>
      <section className="app-card p-6"><h2 className="text-xl font-semibold">Google Agenda</h2><p className="mt-2 text-sm leading-6 text-[var(--text-3)]">Sincronize prazos de tarefas com seu calendário. Esta é a última integração do fluxo e usa OAuth, sem armazenar sua senha Google.</p>
        {google?.status === "connected" ? <><p className="mt-5 text-sm text-emerald-700">Conectado: {google.google_account_email}</p><form action={disconnectGoogleCalendar} className="mt-4"><button className="rounded-lg border border-black/5 px-4 py-2 text-sm">Desconectar</button></form></> : googleConfigured ? <a href="/api/v1/integrations/google/connect" className="mt-5 inline-flex rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]">Conectar Google Agenda</a> : <p className="mt-4 rounded-lg bg-amber-400/10 p-3 text-xs leading-5 text-amber-800">Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_TOKEN_ENCRYPTION_KEY para liberar o botão.</p>}
      </section>
    </div>
  </main>;
}

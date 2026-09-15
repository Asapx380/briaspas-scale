import { getCurrentWorkspace } from "@/lib/workspaces/current";

export default async function OperationsPage() {
  const { supabase, workspaceId } = await getCurrentWorkspace();
  const [{ data: runs, error: runsError }, { data: leads }, { data: visits }] = await Promise.all([
    supabase
      .from("generation_runs")
      .select("status, duration_ms, total_tokens, estimated_cost_usd, provider, model, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("leads").select("source, status, visit_count").eq("workspace_id", workspaceId),
    supabase
      .from("site_visit_sessions")
      .select("viewed_on, leads!inner(workspace_id)")
      .eq("leads.workspace_id", workspaceId)
      .order("viewed_on", { ascending: false })
      .limit(500),
  ]);
  const completed = (runs ?? []).filter((run) => run.status === "succeeded");
  const failed = (runs ?? []).filter((run) => run.status === "failed");
  const avgDuration = completed.length
    ? completed.reduce((sum, run) => sum + Number(run.duration_ms), 0) / completed.length
    : 0;
  const tokens = (runs ?? []).reduce((sum, run) => sum + Number(run.total_tokens ?? 0), 0);
  const cost = (runs ?? []).reduce((sum, run) => sum + Number(run.estimated_cost_usd ?? 0), 0);
  const sourceCounts = Object.entries(
    (leads ?? []).reduce<Record<string, number>>(
      (result, lead) => ({ ...result, [lead.source]: (result[lead.source] ?? 0) + 1 }),
      {},
    ),
  );

  const kpis: [string, string | number][] = [
    ["Gerações concluídas", completed.length],
    ["Falhas", failed.length],
    ["Tempo médio", avgDuration ? `${Math.round(avgDuration / 1000)}s` : "—"],
    ["Tokens registrados", tokens.toLocaleString("pt-BR")],
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Operação e custos</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-3)] sm:text-base">
        Métricas para detectar falhas, acompanhar consumo de IA e decidir qual fonte entrega mais valor.
      </p>

      {runsError && (
        <p className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A observabilidade será ativada após aplicar a migration de produto no Supabase.
        </p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value]) => (
          <article key={String(label)} className="app-card p-5">
            <p className="text-sm text-[var(--text-4)]">{label}</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="app-card p-5">
          <h2 className="font-semibold">Fontes de leads</h2>
          {sourceCounts.length === 0 ? (
            <p className="mt-5 text-sm text-[var(--text-3)]">Nenhuma fonte registrada ainda.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {sourceCounts.map(([source, count]) => (
                <div key={source} className="flex justify-between border-b border-black/5 pb-2 text-sm">
                  <span className="text-[var(--text-3)]">{source}</span>
                  <strong className="tabular-nums">{count}</strong>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="app-card p-5">
          <h2 className="font-semibold">Resumo financeiro da IA</h2>
          <p className="mt-5 text-3xl font-semibold tabular-nums">
            {cost.toLocaleString("pt-BR", { style: "currency", currency: "USD" })}
          </p>
          <p className="mt-2 text-sm text-[var(--text-4)]">
            O valor só aparece quando a tarifa por modelo estiver configurada. Até lá, tokens e
            chamadas continuam registrados.
          </p>
          <p className="mt-5 text-sm text-[var(--text-3)]">
            {visits?.length ?? 0} visitas únicas detalhadas no período disponível.
          </p>
        </article>
      </section>
    </main>
  );
}

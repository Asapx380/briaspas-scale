import { assignLead } from "./actions";
import { getCurrentWorkspace } from "@/lib/workspaces/current";

export default async function TeamPage() {
  const { supabase, workspaceId, role } = await getCurrentWorkspace();
  const [{ data: memberships }, { data: leads }] = await Promise.all([
    supabase.from("workspace_members").select("user_id, role").eq("workspace_id", workspaceId),
    supabase
      .from("leads")
      .select("id, company_name, status, estimated_value, assigned_to, won_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);
  const memberIds = (memberships ?? []).map((member) => member.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name || "Membro"]),
  );
  const members = (memberships ?? []).map((member) => ({
    ...member,
    name: nameById.get(member.user_id) ?? `Membro ${member.user_id.slice(0, 6)}`,
  }));
  const canAssign = ["owner", "admin"].includes(role);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-sm font-medium text-[var(--brand)]">Equipe comercial</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Distribuição e resultado</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-3)] sm:text-base">
        Acompanhe carteira, vendas fechadas e valor por responsável.
      </p>

      {members.length === 0 ? (
        <section className="app-card mt-8 p-7">
          <h2 className="text-lg font-semibold">Nenhum membro ainda</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-3)]">
            Convide o time para distribuir leads e acompanhar o resultado por pessoa.
          </p>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => {
            const owned = (leads ?? []).filter((lead) => lead.assigned_to === member.user_id);
            const won = owned.filter(
              (lead) => lead.status === "won" && lead.won_at && new Date(lead.won_at) >= monthStart,
            );
            const revenue = won.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0);
            return (
              <article key={member.user_id} className="app-card p-5">
                <p className="font-semibold text-[var(--text)]">{member.name}</p>
                <p className="mt-1 text-xs font-medium tracking-wide text-[var(--brand)] uppercase">
                  {member.role}
                </p>
                <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--text-4)]">Leads</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums">{owned.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-4)]">Fechados</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums">{won.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-4)]">Valor</dt>
                    <dd className="mt-1 font-semibold">
                      {revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      )}

      <section className="app-card mt-8 overflow-hidden p-0">
        <div className="border-b border-black/5 px-5 py-4">
          <h2 className="font-semibold">Carteira de leads</h2>
        </div>
        {(leads ?? []).length === 0 ? (
          <p className="px-5 py-8 text-sm text-[var(--text-3)]">
            Sem leads na carteira. Adicione empresas para distribuir.
          </p>
        ) : (
          <div className="divide-y divide-black/5">
            {(leads ?? []).map((lead) => (
              <div
                key={lead.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[var(--text)]">{lead.company_name}</p>
                  <p className="mt-1 text-xs text-[var(--text-4)]">
                    {lead.status} · {nameById.get(lead.assigned_to ?? "") ?? "Sem responsável"}
                  </p>
                </div>
                {canAssign && (
                  <form action={assignLead} className="flex gap-2">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <select
                      name="assigneeId"
                      defaultValue={lead.assigned_to ?? ""}
                      className="rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] px-3 py-2 text-sm"
                    >
                      <option value="">Sem responsável</option>
                      {members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
                      Salvar
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

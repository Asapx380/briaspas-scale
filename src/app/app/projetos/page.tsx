import { ListPagination } from "@/components/ui/list-pagination";
import {
  buildPageMeta,
  parsePage,
  parsePageSize,
  rangeFromPage,
} from "@/lib/pagination/params";
import { createProject, createTask, syncTaskToCalendar, toggleTask } from "./actions";
import { getCurrentWorkspace } from "@/lib/workspaces/current";

type ProjectTask = {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
};

const fieldClass =
  "rounded-xl border border-[var(--border)] bg-[var(--neu-bg-pop)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-4)]";

const PROJECT_PAGE_SIZES = [6, 12, 24] as const;

type ProjectsPageProps = {
  searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[] }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize, PROJECT_PAGE_SIZES, 12);
  const { from, to } = rangeFromPage(page, pageSize);

  const { supabase, workspaceId } = await getCurrentWorkspace();
  const [{ data: projects, error, count }, { data: leads }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, value, due_on, lead_id, project_tasks(id, title, status, priority, due_at)", {
        count: "exact",
      })
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("leads")
      .select("id, company_name")
      .eq("workspace_id", workspaceId)
      .order("company_name")
      .limit(200),
  ]);

  const meta = buildPageMeta(count ?? (projects ?? []).length, page, pageSize);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-sm font-medium text-[var(--brand)]">Entrega</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Projetos e tarefas</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-3)] sm:text-base">
        Transforme uma venda fechada em escopo, prazo e atividades acompanháveis.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Esta área está pronta no código. Aplique a migration de produto no Supabase para ativá-la.
        </p>
      )}

      {!error && (
        <>
          <form action={createProject} className="app-card mt-8 grid gap-3 p-5 md:grid-cols-5">
            <input
              required
              name="name"
              maxLength={160}
              placeholder="Nome do projeto"
              className={`${fieldClass} md:col-span-2`}
            />
            <select name="leadId" aria-label="Lead vinculado" className={fieldClass}>
              <option value="">Sem lead</option>
              {(leads ?? []).map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.company_name}
                </option>
              ))}
            </select>
            <input name="value" inputMode="decimal" placeholder="Valor" className={fieldClass} />
            <button className="rounded-xl bg-[var(--brand-solid)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              Criar projeto
            </button>
          </form>
          {(leads?.length ?? 0) >= 200 ? (
            <p className="mt-2 text-xs text-[var(--text-4)]">
              Select de leads limitado aos 200 primeiros por nome. Use o CRM para localizar os
              demais.
            </p>
          ) : null}

          {(projects ?? []).length === 0 ? (
            <section className="app-card mt-6 p-7">
              <h2 className="text-lg font-semibold">Nenhum projeto ainda</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-3)]">
                Crie o primeiro projeto a partir de uma venda fechada para organizar a entrega.
              </p>
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-5 lg:grid-cols-2">
                {(projects ?? []).map((project) => {
                  const tasks = (project.project_tasks ?? []) as ProjectTask[];
                  return (
                    <article key={project.id} className="app-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-semibold text-[var(--text)]">{project.name}</h2>
                          <p className="mt-1 text-xs font-medium tracking-wide text-[var(--brand)] uppercase">
                            {project.status}
                          </p>
                        </div>
                        {project.value != null && (
                          <p className="text-sm font-medium text-[var(--text-2)]">
                            {Number(project.value).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </p>
                        )}
                      </div>
                      <div className="mt-5 space-y-2">
                        {tasks.map((task) => {
                          const next = task.status === "done" ? "todo" : "done";
                          const action = toggleTask.bind(null, task.id, next);
                          const calendarAction = syncTaskToCalendar.bind(null, task.id);
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 rounded-xl bg-[var(--neu-bg-pop)] p-3"
                            >
                              <form action={action}>
                                <button
                                  aria-label="Alternar conclusão"
                                  className="grid size-5 place-items-center rounded border border-[var(--brand)]/40 text-xs"
                                >
                                  {task.status === "done" ? "✓" : ""}
                                </button>
                              </form>
                              <span
                                className={
                                  task.status === "done"
                                    ? "text-sm text-[var(--text-4)] line-through"
                                    : "text-sm text-[var(--text)]"
                                }
                              >
                                {task.title}
                              </span>
                              <span className="ml-auto text-[10px] tracking-wide text-[var(--text-4)] uppercase">
                                {task.priority}
                              </span>
                              {task.due_at && (
                                <form action={calendarAction}>
                                  <button className="text-xs font-medium text-[var(--brand)] hover:opacity-80">
                                    Agenda
                                  </button>
                                </form>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <form action={createTask} className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input
                          required
                          name="title"
                          maxLength={200}
                          placeholder="Nova tarefa"
                          className={`min-w-0 flex-1 ${fieldClass} py-2`}
                        />
                        <input
                          name="dueAt"
                          type="datetime-local"
                          aria-label="Prazo da tarefa"
                          className={`${fieldClass} py-2`}
                        />
                        <select name="priority" defaultValue="medium" className={`${fieldClass} py-2`}>
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                          <option value="urgent">Urgente</option>
                        </select>
                        <button className="rounded-xl border border-[var(--brand)]/25 px-3 py-2 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brand-solid)]/5">
                          Adicionar
                        </button>
                      </form>
                    </article>
                  );
                })}
              </section>
              <ListPagination
                className="mt-6"
                meta={meta}
                pathname="/app/projetos"
                pageSizeOptions={PROJECT_PAGE_SIZES}
                defaultPageSize={12}
                searchParams={{
                  pageSize: pageSize === 12 ? undefined : String(pageSize),
                }}
                label="Paginação de projetos"
              />
            </>
          )}
        </>
      )}
    </main>
  );
}

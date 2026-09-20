const STORAGE_KEY = "briaspas-crm-lead-timeline";
const MAX_ENTRIES = 80;

export type LeadTimelineKind =
  | "outreach_copy"
  | "outreach_whatsapp"
  | "follow_up_scheduled"
  | "follow_up_task_done"
  | "maps_consulted";

export type LeadTimelineEntry = {
  id: string;
  leadId: number;
  kind: LeadTimelineKind;
  at: string;
  title: string;
  detail?: string;
};

export type LeadFollowUpTask = {
  id: string;
  leadId: number;
  label: string;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
};

const DEFAULT_TASK_LABELS = [
  "Retornar contato após abordagem",
  "Confirmar interesse no site-demo",
  "Agendar conversa de fechamento",
] as const;

function readTimeline(): LeadTimelineEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { timeline?: LeadTimelineEntry[]; tasks?: LeadFollowUpTask[] };
    return Array.isArray(parsed.timeline) ? parsed.timeline : [];
  } catch {
    return [];
  }
}

function readTasks(): LeadFollowUpTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { timeline?: LeadTimelineEntry[]; tasks?: LeadFollowUpTask[] };
    return Array.isArray(parsed.tasks) ? parsed.tasks : [];
  } catch {
    return [];
  }
}

function writeStore(timeline: LeadTimelineEntry[], tasks: LeadFollowUpTask[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        timeline: timeline.slice(0, MAX_ENTRIES),
        tasks,
      }),
    );
  } catch {
    // quota or private mode
  }
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function listTimelineForLead(leadId: number): LeadTimelineEntry[] {
  return readTimeline()
    .filter((entry) => entry.leadId === leadId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function appendTimelineEntry(
  entry: Omit<LeadTimelineEntry, "id" | "at"> & { at?: string },
) {
  const next: LeadTimelineEntry = {
    ...entry,
    id: newId(),
    at: entry.at ?? new Date().toISOString(),
  };
  writeStore([next, ...readTimeline()], readTasks());
}

export function listFollowUpTasksForLead(leadId: number): LeadFollowUpTask[] {
  const existing = readTasks().filter((task) => task.leadId === leadId);
  if (existing.length > 0) return existing;

  const seeded = DEFAULT_TASK_LABELS.map((label) => ({
    id: newId(),
    leadId,
    label,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  }));
  writeStore(readTimeline(), [...readTasks(), ...seeded]);
  return seeded;
}

export function toggleFollowUpTask(leadId: number, taskId: string, done: boolean) {
  const tasks = readTasks().map((task) => {
    if (task.leadId !== leadId || task.id !== taskId) return task;
    return {
      ...task,
      done,
      completedAt: done ? new Date().toISOString() : null,
    };
  });
  writeStore(readTimeline(), tasks);

  const task = tasks.find((item) => item.leadId === leadId && item.id === taskId);
  if (task && done) {
    appendTimelineEntry({
      leadId,
      kind: "follow_up_task_done",
      title: "Tarefa concluída",
      detail: task.label,
    });
  }
}

export function recordFollowUpScheduled(leadId: number, whenIso: string) {
  appendTimelineEntry({
    leadId,
    kind: "follow_up_scheduled",
    title: "Follow-up agendado",
    detail: whenIso,
  });
}

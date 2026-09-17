"use client";

import { useMemo, useState, useTransition } from "react";
import { CaretLeft, CaretRight, Plus, X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { createAppointment } from "@/app/app/agendamentos/actions";

export type AppointmentItem = {
  id: number;
  title: string;
  notes: string | null;
  starts_at: string;
  ends_at: string | null;
  status: "scheduled" | "pending" | "completed" | "cancelled" | string;
  lead_id: number | null;
};

type LeadOption = {
  id: number;
  company_name: string;
};

type AppointmentsPanelProps = {
  appointments: AppointmentItem[];
  leads: LeadOption[];
  loadError: string | null;
  rangeNote?: string | null;
};

type CalendarView = "month" | "week" | "day";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const fieldClass =
  "w-full rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-4)]";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  return endOfDay(next);
}

function addMonths(date: Date, delta: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + delta);
  return next;
}

function addDays(date: Date, delta: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthLabel(date: Date) {
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dayAccessibleLabel(day: Date, count: number) {
  const dateLabel = day.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const countLabel =
    count === 0
      ? "Nenhum agendamento"
      : count === 1
        ? "1 agendamento"
        : `${count} agendamentos`;
  return `${dateLabel}. ${countLabel}. Clique para ver o dia`;
}

function periodUnitLabel(view: CalendarView) {
  if (view === "month") return "mês";
  if (view === "week") return "semana";
  return "dia";
}

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildMonthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function AppointmentsPanel({
  appointments,
  leads,
  loadError,
  rangeNote = null,
}: AppointmentsPanelProps) {
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  const summary = useMemo(() => {
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    let todayCount = 0;
    let weekCount = 0;
    let pendingCount = 0;

    for (const item of appointments) {
      if (item.status === "cancelled") continue;
      const starts = new Date(item.starts_at);
      if (sameDay(starts, today)) todayCount += 1;
      if (starts >= weekStart && starts <= weekEnd) weekCount += 1;
      if (item.status === "pending" || (item.status === "scheduled" && starts >= today)) {
        pendingCount += 1;
      }
    }

    return { todayCount, weekCount, pendingCount };
  }, [appointments, today]);

  const visibleAppointments = useMemo(() => {
    if (view === "day") {
      const day = selectedDay ?? cursor;
      return appointments.filter((item) => sameDay(new Date(item.starts_at), day));
    }
    if (view === "week") {
      const from = startOfWeek(cursor);
      const to = endOfWeek(cursor);
      return appointments.filter((item) => {
        const starts = new Date(item.starts_at);
        return starts >= from && starts <= to;
      });
    }
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    return appointments.filter((item) => {
      const starts = new Date(item.starts_at);
      return starts >= monthStart && starts <= monthEnd;
    });
  }, [appointments, cursor, selectedDay, view]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    for (const item of appointments) {
      const key = startOfDay(new Date(item.starts_at)).toISOString();
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  function goToday() {
    const now = startOfDay(new Date());
    setCursor(now);
    setSelectedDay(now);
  }

  function shiftCursor(delta: number) {
    if (view === "month") setCursor((current) => addMonths(current, delta));
    else if (view === "week") setCursor((current) => addDays(current, delta * 7));
    else {
      setCursor((current) => {
        const next = addDays(selectedDay ?? current, delta);
        setSelectedDay(next);
        return next;
      });
    }
  }

  function openCreate(day?: Date) {
    setSelectedDay(day ?? selectedDay ?? cursor);
    setFormError(null);
    setModalOpen(true);
  }

  function handleCreate(formData: FormData) {
    setFormError(null);
    startTransition(() => {
      void (async () => {
        try {
          await createAppointment(formData);
          setModalOpen(false);
        } catch (error) {
          setFormError(error instanceof Error ? error.message : "Falha ao criar agendamento.");
        }
      })();
    });
  }

  const monthCells = buildMonthCells(cursor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index));
  const activeDay = selectedDay ?? cursor;
  const defaultStartsAt = toDatetimeLocalValue(
    (() => {
      const base = new Date(activeDay);
      if (sameDay(base, today)) {
        const now = new Date();
        base.setHours(now.getHours() + 1, 0, 0, 0);
      } else {
        base.setHours(9, 0, 0, 0);
      }
      return base;
    })(),
  );

  const headerLabel =
    view === "day"
      ? activeDay.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : view === "week"
        ? `${weekDays[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${weekDays[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
        : monthLabel(cursor);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">Agendamentos</h1>
          <p className="mt-2 text-sm text-[var(--text-3)] sm:text-base">
            Visualize e gerencie seus agendamentos
          </p>
          {rangeNote ? (
            <p className="mt-1 text-xs text-[var(--text-4)]">{rangeNote}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.28)] transition-opacity hover:opacity-90"
        >
          <Plus size={16} weight="bold" />
          Novo agendamento
        </button>
      </div>

      {loadError && (
        <p
          role="alert"
          className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {loadError}
        </p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Hoje", value: summary.todayCount },
          { label: "Esta semana", value: summary.weekCount },
          { label: "Pendentes", value: summary.pendingCount },
        ].map((card, index) => (
          <motion.article
            key={card.label}
            className="app-card px-5 py-4"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : index * 0.05, duration: 0.28 }}
          >
            <p className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              {card.value}{" "}
              <span className="text-base font-medium text-[var(--text-3)]">{card.label}</span>
            </p>
          </motion.article>
        ))}
      </section>

      <motion.section
        className="app-card mt-6 overflow-hidden p-4 sm:p-6"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: reduceMotion ? 0 : 0.08 }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label={`${periodUnitLabel(view).charAt(0).toUpperCase()}${periodUnitLabel(view).slice(1)} anterior`}
              title={`${periodUnitLabel(view).charAt(0).toUpperCase()}${periodUnitLabel(view).slice(1)} anterior`}
              onClick={() => shiftCursor(-1)}
              className={`grid size-11 place-items-center rounded-full text-[var(--text-3)] transition-colors hover:bg-[var(--neu-bg-well)] ${FOCUS}`}
            >
              <CaretLeft size={18} weight="bold" aria-hidden />
            </button>
            <h2 className="min-w-[10rem] text-center text-base font-semibold text-[var(--text)] sm:text-lg">
              {headerLabel}
            </h2>
            <button
              type="button"
              aria-label={`Próxim${view === "week" ? "a" : "o"} ${periodUnitLabel(view)}`}
              title={`Próxim${view === "week" ? "a" : "o"} ${periodUnitLabel(view)}`}
              onClick={() => shiftCursor(1)}
              className={`grid size-11 place-items-center rounded-full text-[var(--text-3)] transition-colors hover:bg-[var(--neu-bg-well)] ${FOCUS}`}
            >
              <CaretRight size={18} weight="bold" aria-hidden />
            </button>
            <button
              type="button"
              onClick={goToday}
              className={`ml-1 text-sm font-semibold text-[var(--brand)] hover:opacity-80 ${FOCUS} rounded-md`}
              title="Ir para hoje"
            >
              Hoje
            </button>
          </div>

          <div
            className="inline-flex rounded-full bg-[var(--neu-bg-well)] p-1"
            role="tablist"
            aria-label="Visualização do calendário"
          >
            {(
              [
                ["month", "Mês"],
                ["week", "Semana"],
                ["day", "Dia"],
              ] as const
            ).map(([key, label]) => {
              const active = view === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setView(key);
                    if (key === "day" && !selectedDay) setSelectedDay(cursor);
                  }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[var(--brand)] text-white shadow-[0_4px_12px_rgba(0,113,227,0.28)]"
                      : "text-[var(--text-3)] hover:text-[var(--text)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {view === "month" && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-black/6">
            <div className="grid grid-cols-7 border-b border-black/6 bg-[var(--neu-bg-pop)]">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="border-r border-black/6 px-2 py-3 text-center text-xs font-semibold tracking-wide text-[var(--text-4)] uppercase last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthCells.map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const isToday = sameDay(day, today);
                const dayKey = startOfDay(day).toISOString();
                const dayItems = appointmentsByDay.get(dayKey) ?? [];
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      setCursor(day);
                      if (view !== "month") setView("day");
                    }}
                    onDoubleClick={() => openCreate(day)}
                    aria-label={dayAccessibleLabel(day, dayItems.length)}
                    title={dayAccessibleLabel(day, dayItems.length)}
                    className={`min-h-[5.5rem] border-r border-b border-black/6 p-2 text-left transition-colors last:border-r-0 hover:bg-[var(--brand-tint)]/40 sm:min-h-[6.5rem] ${FOCUS} ${
                      inMonth ? "bg-white" : "bg-[var(--neu-bg-pop)]/70"
                    }`}
                  >
                    <span
                      className={`inline-grid size-7 place-items-center rounded-full text-sm font-medium ${
                        isToday
                          ? "bg-[var(--brand)] font-semibold text-white"
                          : inMonth
                            ? "text-[var(--text)]"
                            : "text-[var(--text-5)]"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayItems.slice(0, 2).map((item) => (
                        <p
                          key={item.id}
                          className="truncate rounded-md bg-[var(--brand-tint)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand)]"
                          title={item.title}
                        >
                          {formatTime(item.starts_at)} {item.title}
                        </p>
                      ))}
                      {dayItems.length > 2 && (
                        <p className="px-1 text-[10px] text-[var(--text-4)]">+{dayItems.length - 2}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-black/6">
            <div className="grid grid-cols-7 border-b border-black/6 bg-[var(--neu-bg-pop)]">
              {weekDays.map((day) => {
                const isToday = sameDay(day, today);
                return (
                  <div key={day.toISOString()} className="border-r border-black/6 px-2 py-3 text-center last:border-r-0">
                    <p className="text-xs font-semibold tracking-wide text-[var(--text-4)] uppercase">
                      {WEEKDAYS[day.getDay()]}
                    </p>
                    <p
                      className={`mx-auto mt-1 inline-grid size-8 place-items-center rounded-full text-sm font-semibold ${
                        isToday ? "bg-[var(--brand)] text-white" : "text-[var(--text)]"
                      }`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7">
              {weekDays.map((day) => {
                const dayKey = startOfDay(day).toISOString();
                const dayItems = appointmentsByDay.get(dayKey) ?? [];
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      setView("day");
                    }}
                    aria-label={dayAccessibleLabel(day, dayItems.length)}
                    title={dayAccessibleLabel(day, dayItems.length)}
                    className={`min-h-[12rem] border-r border-black/6 p-2 text-left align-top last:border-r-0 hover:bg-[var(--brand-tint)]/30 ${FOCUS}`}
                  >
                    <div className="space-y-1.5">
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg bg-[var(--brand-tint)] px-2 py-1.5 text-xs text-[var(--brand)]"
                        >
                          <p className="font-semibold">{formatTime(item.starts_at)}</p>
                          <p className="mt-0.5 line-clamp-2 text-[var(--text-2)]">{item.title}</p>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === "day" && (
          <div className="mt-5 rounded-2xl border border-black/6 bg-white p-4 sm:p-5">
            {visibleAppointments.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-[var(--text-3)]">Nenhum agendamento neste dia</p>
                <button
                  type="button"
                  onClick={() => openCreate(activeDay)}
                  className="mt-4 text-sm font-semibold text-[var(--brand)] hover:opacity-80"
                >
                  + Criar agendamento
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {visibleAppointments.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 rounded-2xl bg-[var(--neu-bg-pop)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[var(--text)]">{item.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-3)]">
                        {formatTime(item.starts_at)}
                        {item.ends_at ? ` – ${formatTime(item.ends_at)}` : ""}
                        {" · "}
                        <span className="capitalize">{item.status}</span>
                      </p>
                      {item.notes && <p className="mt-1 text-sm text-[var(--text-4)]">{item.notes}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </motion.section>

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="novo-agendamento-title"
            aria-busy={pending}
            className="app-card w-full max-w-md p-5 sm:p-6"
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="novo-agendamento-title" className="text-lg font-semibold text-[var(--text)]">
                  Novo agendamento
                </h3>
                <p className="mt-1 text-sm text-[var(--text-3)]">Defina título, horário e status.</p>
              </div>
              <button
                type="button"
                aria-label="Fechar novo agendamento"
                title="Fechar"
                disabled={pending}
                onClick={() => {
                  if (!pending) setModalOpen(false);
                }}
                className={`grid size-11 place-items-center rounded-full text-[var(--text-3)] hover:bg-[var(--neu-bg-well)] disabled:opacity-50 ${FOCUS}`}
              >
                <X size={18} weight="bold" aria-hidden />
              </button>
            </div>

            <form action={handleCreate} className="mt-5 space-y-3">
              <div>
                <label htmlFor="appointment-title" className="mb-1.5 block text-xs font-medium text-[var(--text-3)]">
                  Título
                </label>
                <input
                  id="appointment-title"
                  name="title"
                  required
                  maxLength={200}
                  disabled={pending}
                  placeholder="Ex.: Reunião com cliente"
                  className={fieldClass}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="appointment-starts" className="mb-1.5 block text-xs font-medium text-[var(--text-3)]">
                    Início
                  </label>
                  <input
                    id="appointment-starts"
                    name="startsAt"
                    type="datetime-local"
                    required
                    disabled={pending}
                    defaultValue={defaultStartsAt}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="appointment-ends" className="mb-1.5 block text-xs font-medium text-[var(--text-3)]">
                    Fim (opcional)
                  </label>
                  <input id="appointment-ends" name="endsAt" type="datetime-local" disabled={pending} className={fieldClass} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="appointment-status" className="mb-1.5 block text-xs font-medium text-[var(--text-3)]">
                    Status
                  </label>
                  <select id="appointment-status" name="status" defaultValue="scheduled" disabled={pending} className={fieldClass}>
                    <option value="scheduled">Agendado</option>
                    <option value="pending">Pendente</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="appointment-lead" className="mb-1.5 block text-xs font-medium text-[var(--text-3)]">
                    Lead (opcional)
                  </label>
                  <select id="appointment-lead" name="leadId" defaultValue="" disabled={pending} className={fieldClass}>
                    <option value="">Sem lead</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="appointment-notes" className="mb-1.5 block text-xs font-medium text-[var(--text-3)]">
                  Observações
                </label>
                <textarea
                  id="appointment-notes"
                  name="notes"
                  rows={3}
                  maxLength={2000}
                  disabled={pending}
                  placeholder="Detalhes do encontro"
                  className={fieldClass}
                />
              </div>

              {formError && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!pending) setModalOpen(false);
                  }}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-[var(--text-3)] hover:bg-[var(--neu-bg-well)] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Buildings,
  ChartLineUp,
  CheckCircle,
  Circle,
  Kanban,
  PlusCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type {
  DashboardPeriod,
  KpiMetric,
  OnboardingStep,
  Recommendation,
  TrendPoint,
} from "@/lib/dashboard/metrics";
import { periodLabel } from "@/lib/dashboard/metrics";

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  color: string;
};

const PERIODS: DashboardPeriod[] = ["7d", "30d", "month"];

type PeriodFilterProps = {
  period: DashboardPeriod;
};

export function PeriodFilter({ period }: PeriodFilterProps) {
  const router = useRouter();

  return (
    <div
      className="inline-flex rounded-full bg-[var(--neu-bg-well)] p-1 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)]"
      role="group"
      aria-label="Período do dashboard"
    >
      {PERIODS.map((option) => {
        const active = option === period;
        const label = option === "7d" ? "7 dias" : option === "30d" ? "30 dias" : "Mês";
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => router.push(option === "30d" ? "/app" : `/app?period=${option}`)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              active
                ? "bg-white text-[var(--text)] shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
                : "text-[var(--text-3)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

type KpiGridProps = {
  metrics: KpiMetric[];
  empty: boolean;
};

export function KpiGrid({ metrics, empty }: KpiGridProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <motion.article
          key={metric.key}
          className="app-card p-5"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-xs font-medium text-[var(--text-3)]">{metric.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {empty && metric.key !== "approach" ? "—" : metric.value}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-4)]">{metric.hint}</p>
        </motion.article>
      ))}
    </div>
  );
}

type Shortcut = {
  href: string;
  label: string;
  description: string;
  icon: typeof PlusCircle;
};

const SHORTCUTS: Shortcut[] = [
  {
    href: "/app/leads",
    label: "Adicionar leads",
    description: "Buscar, CSV ou cadastro",
    icon: PlusCircle,
  },
  {
    href: "/app/crm",
    label: "Abrir CRM",
    description: "Pipeline e follow-ups",
    icon: Kanban,
  },
  {
    href: "/app/equipe",
    label: "Equipe",
    description: "Carteira e distribuição",
    icon: Buildings,
  },
  {
    href: "/app/operacao",
    label: "Operação",
    description: "Custos e fontes",
    icon: ChartLineUp,
  },
];

export function DashboardShortcuts() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Atalhos"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      {SHORTCUTS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="app-card group flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--brand-tint)] text-[var(--brand)]">
              <Icon size={20} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--text)]">{item.label}</span>
              <span className="block text-xs text-[var(--text-4)]">{item.description}</span>
            </span>
            <ArrowRight
              size={16}
              weight="bold"
              className="text-[var(--text-4)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand)]"
            />
          </Link>
        );
      })}
    </motion.section>
  );
}

type EmptyDashboardProps = {
  period: DashboardPeriod;
};

export function EmptyDashboard({ period }: EmptyDashboardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className="app-card flex flex-col items-start gap-6 p-7 sm:flex-row sm:items-center sm:p-8"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--brand-tint)] text-[var(--brand)]">
        <Buildings size={28} weight="duotone" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold tracking-tight">Seu funil ainda está vazio</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-3)]">
          Sem leads em {periodLabel(period).toLowerCase()}. Importe empresas ou busque por nicho e
          cidade para começar a medir abordagem e conversão.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/app/leads"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Adicionar leads
            <ArrowRight size={16} weight="bold" />
          </Link>
          <Link
            href="/app/crm"
            className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--neu-bg-pop)]"
          >
            Abrir CRM
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

type OnboardingChecklistProps = {
  steps: OnboardingStep[];
};

export function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const reduceMotion = useReducedMotion();
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;

  return (
    <motion.section
      className="app-card p-6 sm:p-7"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Primeiros passos"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Primeiros passos</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            {doneCount} de {steps.length} concluídos — importe, gere site e mova no CRM
          </p>
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--neu-bg-well)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-center gap-3 rounded-2xl bg-[var(--neu-bg-pop)] px-4 py-3 transition-colors hover:bg-[var(--brand-tint)]"
            >
              {step.done ? (
                <CheckCircle size={20} weight="fill" className="shrink-0 text-[var(--success)]" />
              ) : (
                <Circle size={20} className="shrink-0 text-[var(--text-4)]" />
              )}
              <span
                className={`flex-1 text-sm font-medium ${step.done ? "text-[var(--text-3)] line-through" : "text-[var(--text)]"}`}
              >
                {step.label}
              </span>
              {!step.done && (
                <ArrowRight size={14} weight="bold" className="text-[var(--brand)]" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

type TrendChartProps = {
  points: TrendPoint[];
  period: DashboardPeriod;
};

export function TrendChart({ points, period }: TrendChartProps) {
  const reduceMotion = useReducedMotion();
  const width = 640;
  const height = 180;
  const padX = 12;
  const padY = 16;
  const maxY = Math.max(...points.flatMap((p) => [p.created, p.won]), 1);

  function xAt(index: number) {
    if (points.length <= 1) return width / 2;
    return padX + (index / (points.length - 1)) * (width - padX * 2);
  }

  function yAt(value: number) {
    return height - padY - (value / maxY) * (height - padY * 2);
  }

  function toPath(key: "created" | "won") {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yAt(point[key]).toFixed(1)}`)
      .join(" ");
  }

  const createdTotal = points.reduce((sum, p) => sum + p.created, 0);
  const wonTotal = points.reduce((sum, p) => sum + p.won, 0);

  return (
    <motion.article
      className="app-card p-6 sm:p-7"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Tendência</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Leads criados vs convertidos · {periodLabel(period)}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
            <span className="size-2 rounded-full bg-[var(--brand)]" /> Criados ({createdTotal})
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
            <span className="size-2 rounded-full bg-[var(--funnel-converted)]" /> Convertidos ({wonTotal})
          </span>
        </div>
      </div>

      {createdTotal === 0 && wonTotal === 0 ? (
        <p className="mt-10 text-sm text-[var(--text-3)]">
          Sem movimento neste período. Adicione leads para ver a curva.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-44 w-full min-w-[280px]"
            role="img"
            aria-label="Gráfico de leads criados e convertidos"
          >
            {[0.25, 0.5, 0.75, 1].map((fraction) => (
              <line
                key={fraction}
                x1={padX}
                x2={width - padX}
                y1={yAt(maxY * fraction)}
                y2={yAt(maxY * fraction)}
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="1"
              />
            ))}
            <path
              d={toPath("created")}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={toPath("won")}
              fill="none"
              stroke="var(--funnel-converted)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((point, index) => (
              <g key={point.key}>
                <circle cx={xAt(index)} cy={yAt(point.created)} r="3.5" fill="var(--brand)" />
                <circle
                  cx={xAt(index)}
                  cy={yAt(point.won)}
                  r="3.5"
                  fill="var(--funnel-converted)"
                />
              </g>
            ))}
          </svg>
          <div className="mt-1 flex justify-between px-1 text-[10px] text-[var(--text-4)]">
            <span>{points[0]?.label}</span>
            <span>{points[points.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </motion.article>
  );
}

function totalPercent(count: number, stages: FunnelStage[]) {
  const sum = stages.reduce((acc, stage) => acc + stage.count, 0);
  if (sum === 0) return "0%";
  return `${Math.round((count / sum) * 100)}%`;
}

type ConversionFunnelCardProps = {
  stages: FunnelStage[];
  total: number;
};

export function ConversionFunnelCard({ stages, total }: ConversionFunnelCardProps) {
  const reduceMotion = useReducedMotion();
  const max = Math.max(...stages.map((stage) => stage.count), 1);

  return (
    <motion.article
      className="app-card p-6 sm:p-8"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Funil de conversão</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">Visão das etapas do seu CRM</p>
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-10 text-sm leading-6 text-[var(--text-3)]">
          Quando houver leads, o funil mostra distribuição por status em tempo real.
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end">
            <div
              className="flex h-48 min-w-0 flex-1 items-end gap-1.5 sm:h-52 sm:gap-2"
              aria-label="Gráfico do funil"
            >
              {stages.map((stage, index) => {
                const heightPx = Math.round(88 + (stage.count / max) * 100);
                const shape =
                  index === 0
                    ? "funnel-stage-first"
                    : index === stages.length - 1
                      ? "funnel-stage-last"
                      : "funnel-stage";

                return (
                  <div
                    key={stage.key}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"
                  >
                    <motion.div
                      className={`relative flex w-full items-center justify-center ${shape} transition-transform duration-200 hover:brightness-110`}
                      style={{ height: heightPx, backgroundColor: stage.color }}
                      initial={reduceMotion ? false : { scaleY: 0.35, opacity: 0.4 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{
                        duration: 0.65,
                        delay: index * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <div className="px-1 text-center text-white">
                        <p className="text-lg font-bold sm:text-2xl">{stage.count}</p>
                        <p className="hidden text-[10px] font-medium opacity-80 sm:block">
                          {totalPercent(stage.count, stages)}
                        </p>
                      </div>
                    </motion.div>
                    <p className="max-w-full truncate text-center text-[11px] font-medium text-[var(--text-3)] sm:text-xs">
                      {stage.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <motion.div
              className="mx-auto grid size-36 shrink-0 place-items-center rounded-full border-[10px] border-[var(--neu-bg-well)] bg-white sm:mx-0"
              initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center">
                <p className="text-3xl font-bold tracking-tight">{total}</p>
                <p className="mt-1 text-[11px] font-medium text-[var(--text-3)]">Total de leads</p>
              </div>
            </motion.div>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stages.map((stage) => (
              <li
                key={`legend-${stage.key}`}
                className="flex items-center gap-2 text-sm text-[var(--text-2)]"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="font-medium">{stage.label}</span>
                <span className="text-[var(--text-4)]">· {stage.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </motion.article>
  );
}

type LeadFunnelListProps = {
  stages: FunnelStage[];
  total: number;
};

export function LeadFunnelList({ stages, total }: LeadFunnelListProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className="app-card flex h-full flex-col p-6 sm:p-7"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 className="text-lg font-semibold tracking-tight">Funil de leads</h2>
      <p className="mt-1 text-sm text-[var(--text-3)]">Distribuição por status</p>

      <ul className="mt-6 flex-1 space-y-4">
        {stages.map((stage, index) => {
          const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
          return (
            <li key={stage.key} className="flex items-center gap-3">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="w-24 shrink-0 text-sm font-medium text-[var(--text)] sm:w-28">
                {stage.label}
              </span>
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--neu-bg-well)] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.06)]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: stage.color, width: `${pct}%` }}
                  initial={reduceMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.15 + index * 0.05,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </div>
              <span className="w-8 text-right text-sm font-semibold tabular-nums">{stage.count}</span>
            </li>
          );
        })}
      </ul>

      <Link
        href="/app/crm"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)] transition-colors hover:text-[var(--brand-hover)]"
      >
        Ver CRM
        <ArrowRight size={16} weight="bold" />
      </Link>
    </motion.article>
  );
}

type RecommendationsCardProps = {
  items: Recommendation[];
};

export function RecommendationsCard({ items }: RecommendationsCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className="app-card h-full p-6 sm:p-7"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 className="text-lg font-semibold tracking-tight">Recomendações</h2>
      <p className="mt-1 text-sm text-[var(--text-3)]">Prioridade com base em estágio e atraso</p>

      <ul className="mt-6 space-y-3">
        {items.map((item, index) => (
          <motion.li
            key={item.id}
            className="rounded-2xl bg-[var(--neu-bg-pop)] px-4 py-3"
            initial={reduceMotion ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
          >
            <div className="flex items-start gap-2.5">
              {item.id === "overdue" || item.id === "stale" ? (
                <WarningCircle
                  size={18}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-[var(--warning)]"
                />
              ) : (
                <ChartLineUp size={18} weight="fill" className="mt-0.5 shrink-0 text-[var(--brand)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-[var(--text-2)]">{item.text}</p>
                {item.href && item.cta && (
                  <Link
                    href={item.href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:text-[var(--brand-hover)]"
                  >
                    {item.cta}
                    <ArrowRight size={12} weight="bold" />
                  </Link>
                )}
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.article>
  );
}

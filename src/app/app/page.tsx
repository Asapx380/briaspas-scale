import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  ConversionFunnelCard,
  DashboardShortcuts,
  EmptyDashboard,
  KpiGrid,
  LeadFunnelList,
  OnboardingChecklist,
  PeriodFilter,
  RecommendationsCard,
  TrendChart,
} from "@/components/app/dashboard-widgets";
import {
  buildFunnelStages,
  buildKpis,
  buildOnboarding,
  buildRecommendations,
  buildTrend,
  parsePeriod,
  periodLabel,
  type DashboardLead,
} from "@/lib/dashboard/metrics";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{ period?: string | string[] }>;
};

/** Narrow columns only — enough for KPIs/funnel without shipping unused fields. */
const DASHBOARD_LEAD_COLUMNS =
  "status, follow_up_at, site_status, created_at, won_at, estimated_value, updated_at";

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const supabase = await createClient();

  // Batched scan avoids silent PostgREST ~1000-row truncation on large workspaces.
  const leads: DashboardLead[] = [];
  const batchSize = 500;
  let from = 0;
  let truncated = false;
  for (;;) {
    const { data } = await supabase
      .from("leads")
      .select(DASHBOARD_LEAD_COLUMNS)
      .order("created_at", { ascending: false })
      .range(from, from + batchSize - 1);
    const chunk = (data ?? []) as DashboardLead[];
    leads.push(...chunk);
    if (chunk.length < batchSize) break;
    from += batchSize;
    if (from >= 10_000) {
      truncated = true;
      break;
    }
  }

  const now = new Date();
  const nowMs = now.getTime();
  const stages = buildFunnelStages(leads, nowMs);
  const total = leads.length;
  const kpis = buildKpis(leads, period, now);
  const recommendations = buildRecommendations(leads, nowMs);
  const trend = buildTrend(leads, period, now);
  const onboarding = buildOnboarding(leads);
  const empty = total === 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--text-3)] sm:text-base">
            Visão geral · {periodLabel(period)}
            {truncated ? " · amostra limitada a 10k leads" : ""}          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter period={period} />
          <Link
            href="/app/leads"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-solid)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(0,113,227,0.3)] transition-opacity hover:opacity-90"
          >
            Adicionar leads
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <OnboardingChecklist steps={onboarding} />
      </div>

      <div className="mt-5">
        <KpiGrid metrics={kpis} empty={empty} />
      </div>

      <div className="mt-5">
        <DashboardShortcuts />
      </div>

      {empty ? (
        <div className="mt-5">
          <EmptyDashboard period={period} />
        </div>
      ) : null}

      <div className="mt-5">
        <TrendChart points={trend} period={period} />
      </div>

      <div className="mt-5">
        <ConversionFunnelCard stages={stages} total={total} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <LeadFunnelList stages={stages} total={total} />
        <RecommendationsCard items={recommendations} />
      </div>
    </main>
  );
}

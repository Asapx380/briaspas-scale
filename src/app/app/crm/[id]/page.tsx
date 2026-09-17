import dynamic from "next/dynamic";
import { loadCrmLeadDetail } from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const LeadDetailView = dynamic(
  () => import("@/components/crm/lead-detail-view").then((mod) => mod.LeadDetailView),
  {
    loading: () => (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-[var(--neu-bg-well)]" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-[var(--neu-bg-well)]" />
      </main>
    ),
  },
);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CrmLeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await createClient();
  const { lead, siblingIds, notFound: missing } = await loadCrmLeadDetail(supabase, id);
  if (missing || !lead) notFound();

  return <LeadDetailView lead={lead} siblingIds={siblingIds} />;
}

import nextDynamic from "next/dynamic";
import { CRM_DEMO_LEADS } from "@/lib/crm/fixtures";
import { notFound } from "next/navigation";

const LeadDetailView = nextDynamic(
  () => import("@/components/crm/lead-detail-view").then((mod) => mod.LeadDetailView),
);

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CrmDetailPreviewPage({ params }: PageProps) {
  if (process.env.CRM_UI_PREVIEW !== "1") {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-sm text-[var(--text-3)]">
        Preview desativado. Defina CRM_UI_PREVIEW=1.
      </main>
    );
  }

  const { id } = await params;
  const lead = CRM_DEMO_LEADS.find((item) => String(item.id) === id);
  if (!lead) notFound();

  return (
    <div className="app-canvas min-h-screen">
      <LeadDetailView
        lead={lead}
        siblingIds={CRM_DEMO_LEADS.map((item) => item.id)}
        demoMode
      />
    </div>
  );
}

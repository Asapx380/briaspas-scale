import { CrmBoard } from "@/components/crm/crm-board";
import { CRM_DEMO_LEADS } from "@/lib/crm/fixtures";

export const dynamic = "force-dynamic";

/** Preview sem auth — use CRM_UI_PREVIEW=1 para screenshots locais. */
export default function CrmPreviewPage() {
  if (process.env.CRM_UI_PREVIEW !== "1") {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-sm text-[var(--text-3)]">
        Preview desativado. Defina CRM_UI_PREVIEW=1.
      </main>
    );
  }

  return (
    <div className="app-canvas min-h-screen">
      <CrmBoard initialLeads={CRM_DEMO_LEADS} loadError={null} demoMode />
    </div>
  );
}

import dynamic from "next/dynamic";
import { loadCrmBoardData } from "@/lib/crm/queries";
import { createClient } from "@/lib/supabase/server";

const CrmBoard = dynamic(
  () => import("@/components/crm/crm-board").then((mod) => mod.CrmBoard),
  {
    loading: () => (
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-[var(--neu-bg-well)]" />
        <div className="mt-5 h-11 max-w-xl animate-pulse rounded-2xl bg-[var(--neu-bg-well)]" />
        <div className="mt-6 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[420px] w-[260px] shrink-0 animate-pulse rounded-[20px] bg-[var(--neu-bg-well)]/80 sm:w-[272px]"
            />
          ))}
        </div>
      </main>
    ),
  },
);

export default async function CrmPage() {
  const supabase = await createClient();
  const { leads, conversations, error } = await loadCrmBoardData(supabase);

  return (
    <CrmBoard
      initialLeads={leads}
      loadError={error}
      whatsappConversations={conversations}
    />
  );
}

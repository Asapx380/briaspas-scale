import dynamic from "next/dynamic";
import type { CrmFilterId, CrmLead, CrmSortId } from "@/lib/crm/types";
import { createClient } from "@/lib/supabase/server";
import {
  CRM_DEFAULT_PAGE_SIZE,
  CRM_LEAD_COLUMNS,
  CRM_PAGE_SIZE_OPTIONS,
} from "@/lib/pagination/crm-query";
import {
  buildPageMeta,
  parsePage,
  parsePageSize,
  rangeFromPage,
} from "@/lib/pagination/params";

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

type CrmPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    q?: string | string[];
    filter?: string | string[];
    sort?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilter(value: string | undefined): CrmFilterId {
  const allowed: CrmFilterId[] = [
    "all",
    "no_site",
    "tier_quente",
    "tier_morno",
    "score_50",
    "with_phone",
  ];
  return allowed.includes(value as CrmFilterId) ? (value as CrmFilterId) : "all";
}

function parseSort(value: string | undefined): CrmSortId {
  const allowed: CrmSortId[] = ["recent", "score_desc", "name_asc", "rating_desc"];
  return allowed.includes(value as CrmSortId) ? (value as CrmSortId) : "recent";
}

export default async function CrmPage({ searchParams }: CrmPageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize, CRM_PAGE_SIZE_OPTIONS, CRM_DEFAULT_PAGE_SIZE);
  const q = (first(params.q) ?? "").trim();
  const filter = parseFilter(first(params.filter));
  const sort = parseSort(first(params.sort));
  const { from, to } = rangeFromPage(page, pageSize);

  const supabase = await createClient();
  let query = supabase.from("leads").select(CRM_LEAD_COLUMNS, { count: "exact" }).is("deleted_at", null);

  if (q) {
    const escaped = q.replace(/[%_,]/g, "");
    query = query.or(
      `company_name.ilike.%${escaped}%,niche.ilike.%${escaped}%,city.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
    );
  }

  if (filter === "no_site") {
    query = query.or("site_status.is.null,site_status.eq.not_generated");
  } else if (filter === "with_phone") {
    query = query.not("phone", "is", null).neq("phone", "");
  }

  if (sort === "name_asc") {
    query = query.order("company_name", { ascending: true });
  } else if (sort === "rating_desc") {
    query = query.order("rating", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

  const { data: conversations } = await supabase
    .from("whatsapp_conversations")
    .select("id, lead_id, contact_name, contact_phone, agent_enabled, last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(20);

  const initialLeads = (data ?? []) as CrmLead[];
  const meta = buildPageMeta(count ?? initialLeads.length, page, pageSize);

  return (
    <CrmBoard
      initialLeads={initialLeads}
      loadError={
        error
          ? "Não foi possível carregar os leads. Atualize a página para tentar novamente."
          : null
      }
      whatsappConversations={conversations ?? []}
      pagination={meta}
      listQuery={{ q, filter, sort }}
    />
  );
}

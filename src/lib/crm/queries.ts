import type { CrmLead } from "@/lib/crm/types";

/** Colunas do Kanban — sem JSON pesado (site_brief / AI) nem campos só do detalhe. */
export const CRM_BOARD_LEAD_COLUMNS =
  "id, company_name, phone, email, address, niche, city, status, website_url, google_maps_url, rating, review_count, source, slug, visit_count, site_status, created_at, updated_at" as const;

/** Detalhe: um select com AI + brief (antes eram 2 queries na mesma row). */
export const CRM_DETAIL_LEAD_COLUMNS =
  "id, company_name, phone, email, address, niche, city, status, notes, estimated_value, follow_up_at, website_url, google_maps_url, rating, review_count, source, slug, visit_count, site_status, site_source, site_brief, ai_diagnosis, ai_outreach, created_at, updated_at" as const;

export const CRM_WHATSAPP_CONVERSATION_COLUMNS =
  "id, lead_id, contact_name, contact_phone, agent_enabled, last_message_at" as const;

export type CrmBoardLoadResult = {
  leads: CrmLead[];
  conversations: Array<{
    id: number;
    lead_id: number | null;
    contact_name: string | null;
    contact_phone: string | null;
    agent_enabled: boolean;
    last_message_at: string | null;
  }>;
  error: string | null;
  /** Round-trips efetivos à API PostgREST/Storage nesta carga. */
  queryCount: number;
};

export type CrmDetailLoadResult = {
  lead: CrmLead | null;
  siblingIds: number[];
  notFound: boolean;
  queryCount: number;
};

/** Aceita o client Supabase real ou o instrumentado dos testes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CrmQueryClient = { from: (table: string) => any };

function asLeadRow(row: Record<string, unknown>): CrmLead {
  return {
    id: row.id as number,
    company_name: row.company_name as string,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    niche: (row.niche as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    status: row.status as CrmLead["status"],
    notes: (row.notes as string | null) ?? null,
    estimated_value: (row.estimated_value as number | null) ?? null,
    follow_up_at: (row.follow_up_at as string | null) ?? null,
    website_url: (row.website_url as string | null) ?? null,
    google_maps_url: (row.google_maps_url as string | null) ?? null,
    rating: (row.rating as number | null) ?? null,
    review_count: (row.review_count as number | null) ?? null,
    source: (row.source as string) ?? "manual",
    slug: (row.slug as string) ?? "",
    visit_count: (row.visit_count as number) ?? 0,
    site_status: (row.site_status as CrmLead["site_status"]) ?? "not_generated",
    site_source: (row.site_source as CrmLead["site_source"]) ?? null,
    site_brief: (row.site_brief as CrmLead["site_brief"]) ?? null,
    ai_diagnosis: (row.ai_diagnosis as CrmLead["ai_diagnosis"]) ?? null,
    ai_outreach: (row.ai_outreach as CrmLead["ai_outreach"]) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

/** Board: 2 queries em paralelo (antes: 3 sequenciais, com 2× scan em leads). */
export async function loadCrmBoardData(supabase: CrmQueryClient): Promise<CrmBoardLoadResult> {
  let queryCount = 0;

  const leadsPromise = (async () => {
    queryCount += 1;
    return supabase
      .from("leads")
      .select(CRM_BOARD_LEAD_COLUMNS)
      .order("created_at", { ascending: false });
  })();

  const conversationsPromise = (async () => {
    queryCount += 1;
    return supabase
      .from("whatsapp_conversations")
      .select(CRM_WHATSAPP_CONVERSATION_COLUMNS)
      .order("last_message_at", { ascending: false })
      .limit(20);
  })();

  const [leadsResult, conversationsResult] = await Promise.all([leadsPromise, conversationsPromise]);

  const leads = ((leadsResult.data ?? []) as Record<string, unknown>[]).map((row) =>
    asLeadRow({
      ...row,
      notes: null,
      estimated_value: null,
      follow_up_at: null,
      site_source: null,
      site_brief: null,
      ai_diagnosis: null,
      ai_outreach: null,
    }),
  );

  return {
    leads,
    conversations: (conversationsResult.data ?? []) as CrmBoardLoadResult["conversations"],
    error: leadsResult.error
      ? "Não foi possível carregar os leads. Atualize a página para tentar novamente."
      : null,
    queryCount,
  };
}

/**
 * Plano legado do board (pré-fix) — usado só em benchmarks/testes de regressão.
 * 3 round-trips sequenciais: leads wide → leads AI → conversations.
 */
export async function loadCrmBoardDataLegacy(supabase: CrmQueryClient): Promise<CrmBoardLoadResult> {
  let queryCount = 0;

  queryCount += 1;
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, phone, email, address, niche, city, status, notes, estimated_value, follow_up_at, website_url, google_maps_url, rating, review_count, source, slug, visit_count, site_status, site_source, site_brief, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  queryCount += 1;
  const withAi = await supabase.from("leads").select("id, ai_diagnosis, ai_outreach").limit(500);

  const aiById = new Map(
    ((withAi.data ?? []) as Array<{ id: number; ai_diagnosis: unknown; ai_outreach: unknown }>).map(
      (row) => [row.id, row] as const,
    ),
  );

  queryCount += 1;
  const { data: conversations } = await supabase
    .from("whatsapp_conversations")
    .select(CRM_WHATSAPP_CONVERSATION_COLUMNS)
    .order("last_message_at", { ascending: false })
    .limit(20);

  const leads = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const ai = aiById.get(row.id as number);
    return asLeadRow({
      ...row,
      ai_diagnosis: ai?.ai_diagnosis ?? null,
      ai_outreach: ai?.ai_outreach ?? null,
    });
  });

  return {
    leads,
    conversations: (conversations ?? []) as CrmBoardLoadResult["conversations"],
    error: error ? "Não foi possível carregar os leads. Atualize a página para tentar novamente." : null,
    queryCount,
  };
}

/** Detalhe: lead completo + siblings em paralelo (antes: 3 sequenciais na tabela leads). */
export async function loadCrmLeadDetail(
  supabase: CrmQueryClient,
  id: string,
): Promise<CrmDetailLoadResult> {
  let queryCount = 0;

  const leadPromise = (async () => {
    queryCount += 1;
    return supabase.from("leads").select(CRM_DETAIL_LEAD_COLUMNS).eq("id", id).maybeSingle();
  })();

  const siblingsPromise = (async () => {
    queryCount += 1;
    return supabase.from("leads").select("id").order("created_at", { ascending: false });
  })();

  const [leadResult, siblingsResult] = await Promise.all([leadPromise, siblingsPromise]);

  if (leadResult.error || !leadResult.data) {
    return { lead: null, siblingIds: [], notFound: true, queryCount };
  }

  return {
    lead: asLeadRow(leadResult.data as Record<string, unknown>),
    siblingIds: ((siblingsResult.data ?? []) as Array<{ id: number }>).map((row) => row.id),
    notFound: false,
    queryCount,
  };
}

/** Plano legado do detalhe — 3 selects sequenciais em `leads`. */
export async function loadCrmLeadDetailLegacy(
  supabase: CrmQueryClient,
  id: string,
): Promise<CrmDetailLoadResult> {
  let queryCount = 0;

  queryCount += 1;
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, phone, email, address, niche, city, status, notes, estimated_value, follow_up_at, website_url, google_maps_url, rating, review_count, source, slug, visit_count, site_status, site_source, site_brief, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { lead: null, siblingIds: [], notFound: true, queryCount };
  }

  queryCount += 1;
  const { data: aiRow } = await supabase
    .from("leads")
    .select("ai_diagnosis, ai_outreach")
    .eq("id", id)
    .maybeSingle();

  queryCount += 1;
  const { data: siblings } = await supabase
    .from("leads")
    .select("id")
    .order("created_at", { ascending: false });

  return {
    lead: asLeadRow({
      ...(data as Record<string, unknown>),
      ai_diagnosis: (aiRow as { ai_diagnosis?: unknown } | null)?.ai_diagnosis ?? null,
      ai_outreach: (aiRow as { ai_outreach?: unknown } | null)?.ai_outreach ?? null,
    }),
    siblingIds: ((siblings ?? []) as Array<{ id: number }>).map((row) => row.id),
    notFound: false,
    queryCount,
  };
}

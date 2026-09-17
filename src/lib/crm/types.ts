import type { SiteBrief } from "@/lib/sites/design-plan";

export type LeadStatus = "new" | "contacted" | "replied" | "hot" | "proposal" | "won" | "lost";

export type CrmLead = {
  id: number;
  company_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  niche: string | null;
  city: string | null;
  status: LeadStatus;
  notes: string | null;
  estimated_value: number | null;
  follow_up_at: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number | null;
  source: string;
  slug: string;
  visit_count: number;
  site_status: "not_generated" | "generating" | "ready" | "failed" | "published";
  site_source: "uploaded" | "generated" | null;
  site_brief: SiteBrief | null;
  ai_diagnosis: {
    resumo?: string;
    dorPrincipal?: string;
    prioridade?: string;
  } | null;
  ai_outreach: {
    mensagem?: string;
    canal?: string;
    channel?: string;
  } | null;
  created_at: string;
  updated_at: string | null;
};

export type LeadPatch = Pick<CrmLead, "id"> & Partial<CrmLead>;

export type LeadTier = "quente" | "morno" | "frio";

export type PipelineColumnId =
  | "base"
  | "abordado"
  | "agendado"
  | "followup"
  | "convertido"
  | "perdido";

export type CrmFilterId =
  | "all"
  | "no_site"
  | "tier_quente"
  | "tier_morno"
  | "score_50"
  | "with_phone";

export type CrmSortId = "recent" | "score_desc" | "name_asc" | "rating_desc";

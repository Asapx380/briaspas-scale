import type { CrmFilterId, CrmLead, CrmSortId } from "@/lib/crm/types";
import { matchesFilter, matchesSearch, sortLeads } from "@/lib/crm/pipeline";

export const CRM_LEAD_COLUMNS =
  "id, company_name, phone, email, address, niche, city, status, notes, estimated_value, follow_up_at, website_url, google_maps_url, rating, review_count, source, slug, visit_count, site_status, site_source, site_brief, ai_diagnosis, ai_outreach, created_at, updated_at";

export const CRM_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const CRM_DEFAULT_PAGE_SIZE = 50;

/** Filters that need computed score/tier — applied after fetch on the page window. */
export function isClientSideCrmFilter(filter: CrmFilterId) {
  return filter === "tier_quente" || filter === "tier_morno" || filter === "score_50";
}

export function applyCrmClientWindow(
  leads: CrmLead[],
  query: string,
  filter: CrmFilterId,
  sort: CrmSortId,
) {
  const list = leads.filter(
    (lead) => matchesSearch(lead, query) && matchesFilter(lead, filter),
  );
  return sortLeads(list, sort);
}

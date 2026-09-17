export type LeadNeighbors = {
  prevId: number | null;
  nextId: number | null;
  position: number;
  total: number;
};

/**
 * Neighbor navigation without loading every lead id.
 * Order: created_at DESC (matches CRM list).
 */
export async function resolveLeadNeighbors(
  // Supabase query builder — keep loose to avoid coupling to generated Database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  lead: { id: number; created_at: string },
): Promise<LeadNeighbors> {
  const [{ count: total }, { count: newerCount }, newerResult, olderResult] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gt("created_at", lead.created_at),
    supabase
      .from("leads")
      .select("id")
      .gt("created_at", lead.created_at)
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("leads")
      .select("id")
      .lt("created_at", lead.created_at)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const safeTotal = (total as number | null) ?? 0;
  return {
    prevId: (newerResult.data?.[0]?.id as number | undefined) ?? null,
    nextId: (olderResult.data?.[0]?.id as number | undefined) ?? null,
    position: safeTotal === 0 ? 1 : ((newerCount as number | null) ?? 0) + 1,
    total: Math.max(safeTotal, 1),
  };
}

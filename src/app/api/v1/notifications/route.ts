import { createClient } from "@/lib/supabase/server";
import { parsePage, parsePageSize, rangeFromPage } from "@/lib/pagination/params";

export const runtime = "nodejs";

const NOTIFICATION_PAGE_SIZES = [15, 30, 50] as const;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta.", 401);
  }

  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page") ?? undefined);
  const limit = parsePageSize(url.searchParams.get("limit") ?? undefined, NOTIFICATION_PAGE_SIZES, 30);
  const { from, to } = rangeFromPage(page, limit);

  const { data, error, count } = await supabase
    .from("workspace_notifications")
    .select("id, kind, title, body, metadata, read_at, created_at, lead_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return Response.json({
      data: { items: [], unread: 0, page, limit, total: 0, hasMore: false },
    });
  }

  const items = data ?? [];
  const total = count ?? items.length;
  const hasMore = from + items.length < total;
  const unread = items.filter((item) => !item.read_at).length;
  return Response.json({ data: { items, unread, page, limit, total, hasMore } });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta.", 401);
  }

  let body: { ids?: number[]; markAll?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const now = new Date().toISOString();
  if (body.markAll) {
    await supabase.from("workspace_notifications").update({ read_at: now }).is("read_at", null);
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await supabase.from("workspace_notifications").update({ read_at: now }).in("id", body.ids);
  }

  return Response.json({ data: { ok: true } });
}

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta.", 401);
  }

  const { data, error } = await supabase
    .from("workspace_notifications")
    .select("id, kind, title, body, metadata, read_at, created_at, lead_id")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return Response.json({ data: { items: [], unread: 0 } });
  }

  const items = data ?? [];
  const unread = items.filter((item) => !item.read_at).length;
  return Response.json({ data: { items, unread } });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta.", 401);
  }

  let body: { ids?: number[]; markAll?: boolean } = {};
  try {
    body = await request.json() as typeof body;
  } catch {
    body = {};
  }

  const now = new Date().toISOString();
  if (body.markAll) {
    await supabase
      .from("workspace_notifications")
      .update({ read_at: now })
      .is("read_at", null);
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await supabase
      .from("workspace_notifications")
      .update({ read_at: now })
      .in("id", body.ids);
  }

  return Response.json({ data: { ok: true } });
}

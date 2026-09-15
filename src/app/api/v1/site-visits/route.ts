import { createHash } from "node:crypto";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";

export const runtime = "nodejs";

const BOT_PATTERN = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slack/i;

function shortText(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= maximum ? text || null : undefined;
}

export async function POST(request: Request) {
  if (BOT_PATTERN.test(request.headers.get("user-agent") ?? "")) {
    return new Response(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { code: "invalid_json", message: "Dados de visita inválidos." } }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: { code: "validation_error", message: "Dados de visita inválidos." } }, { status: 422 });
  }

  const values = body as Record<string, unknown>;
  const slug = shortText(values.slug, 240);
  const sessionId = shortText(values.sessionId, 100);
  const referrerHost = shortText(values.referrerHost, 255);
  const utmSource = shortText(values.utmSource, 120);
  const utmMedium = shortText(values.utmMedium, 120);
  const utmCampaign = shortText(values.utmCampaign, 120);
  if (
    !slug || !sessionId ||
    referrerHost === undefined || utmSource === undefined ||
    utmMedium === undefined || utmCampaign === undefined
  ) {
    return Response.json({ error: { code: "validation_error", message: "Dados de visita inválidos." } }, { status: 422 });
  }

  const sessionHash = createHash("sha256").update(sessionId).digest("hex");
  const rateLimit = checkRateLimit(`site-visit:${sessionHash}`, { limit: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const supabase = createPublicClient();
  const { error } = await supabase.rpc("track_public_lead_site_visit", {
    target_slug: slug,
    target_session_hash: sessionHash,
    target_referrer_host: referrerHost,
    target_utm_source: utmSource,
    target_utm_medium: utmMedium,
    target_utm_campaign: utmCampaign,
  });

  if (error) return new Response(null, { status: 204 });
  return new Response(null, { status: 204 });
}

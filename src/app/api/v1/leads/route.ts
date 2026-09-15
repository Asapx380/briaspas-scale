import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createLeadSlug } from "@/lib/leads/slug";
import { createLeadIdentityKey } from "@/lib/leads/identity";

export const runtime = "nodejs";

type CreateLeadInput = {
  source: "manual" | "foursquare" | "google_places";
  sourceRef: string | null;
  googlePlaceId: string | null;
  companyName: string;
  phone: string | null;
  address: string | null;
  niche: string;
  city: string;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  email: string | null;
  instagram: string | null;
  facebookId: string | null;
  twitter: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ErrorCode =
  | "invalid_json"
  | "validation_error"
  | "unauthorized"
  | "workspace_not_found"
  | "lead_already_exists"
  | "lead_creation_failed";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function nullableString(
  value: unknown,
  maximumLength: number,
): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) return null;
  if (normalizedValue.length > maximumLength) return undefined;

  return normalizedValue;
}

function nullableUrl(value: unknown): string | null | undefined {
  const text = nullableString(value, 500);
  if (text === null || text === undefined) return text;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? text : undefined;
  } catch {
    return undefined;
  }
}

function nullableNumber(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
}

function manualSourceReference(input: CreateLeadInput) {
  const identity = [input.companyName, input.phone, input.address, input.city]
    .map((value) => value?.trim().toLocaleLowerCase("pt-BR") ?? "")
    .join("|");
  return createHash("sha256").update(identity).digest("hex");
}

function parseInput(value: unknown): CreateLeadInput | null {
  if (!value || typeof value !== "object") return null;

  const body = value as Record<string, unknown>;
  const requestedSource = body.source;
  const source = requestedSource === undefined
    ? body.googlePlaceId ? "google_places" : "manual"
    : requestedSource === "manual" || requestedSource === "foursquare" || requestedSource === "google_places"
      ? requestedSource
      : null;
  const sourceRef = nullableString(body.sourceRef, 500);
  const googlePlaceId = nullableString(body.googlePlaceId, 500);
  const companyName = nullableString(body.companyName, 200);
  const phone = nullableString(body.phone, 80);
  const address = nullableString(body.address, 500);
  const niche = nullableString(body.niche, 80);
  const city = nullableString(body.city, 100);
  const websiteUrl = nullableUrl(body.websiteUrl);
  const googleMapsUrl = nullableUrl(body.googleMapsUrl);
  const email = nullableString(body.email, 320);
  const instagram = nullableString(body.instagram, 200);
  const facebookId = nullableString(body.facebookId, 200);
  const twitter = nullableString(body.twitter, 200);
  const latitude = nullableNumber(body.latitude, -90, 90);
  const longitude = nullableNumber(body.longitude, -180, 180);
  const rating = body.rating === null || body.rating === undefined
    ? null
    : typeof body.rating === "number" && body.rating >= 0 && body.rating <= 5
      ? body.rating
      : undefined;
  const reviewCount = body.reviewCount === null || body.reviewCount === undefined
    ? null
    : typeof body.reviewCount === "number" && Number.isInteger(body.reviewCount) && body.reviewCount >= 0
      ? body.reviewCount
      : undefined;

  if (
    !companyName ||
    !source ||
    !niche ||
    !city ||
    googlePlaceId === undefined ||
    phone === undefined ||
    address === undefined ||
    websiteUrl === undefined ||
    googleMapsUrl === undefined ||
    sourceRef === undefined ||
    email === undefined ||
    instagram === undefined ||
    facebookId === undefined ||
    twitter === undefined ||
    latitude === undefined ||
    longitude === undefined ||
    rating === undefined ||
    reviewCount === undefined ||
    (source !== "manual" && !sourceRef)
  ) {
    return null;
  }

  return {
    source,
    sourceRef,
    googlePlaceId,
    companyName,
    phone,
    address,
    niche,
    city,
    websiteUrl,
    googleMapsUrl,
    rating,
    reviewCount,
    email,
    instagram,
    facebookId,
    twitter,
    latitude,
    longitude,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return errorResponse(
      "unauthorized",
      "Entre na sua conta para salvar empresas no CRM.",
      401,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "O corpo da requisição não é um JSON válido.", 400);
  }

  const input = parseInput(body);

  if (!input) {
    return errorResponse(
      "validation_error",
      "Os dados da empresa estão incompletos ou são inválidos.",
      422,
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return errorResponse(
      "workspace_not_found",
      "Não encontramos um espaço de trabalho para esta conta.",
      403,
    );
  }

  const { data: possibleDuplicates } = await supabase
    .from("leads")
    .select("company_name, phone, city")
    .eq("workspace_id", membership.workspace_id)
    .ilike("company_name", input.companyName);
  const identityKey = createLeadIdentityKey({
    companyName: input.companyName,
    phone: input.phone,
    city: input.city,
  });
  if ((possibleDuplicates ?? []).some((lead) => createLeadIdentityKey({
    companyName: lead.company_name,
    phone: lead.phone,
    city: lead.city,
  }) === identityKey)) {
    return errorResponse("lead_already_exists", "Esta empresa já está salva no seu CRM.", 409);
  }

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      workspace_id: membership.workspace_id,
      google_place_id: input.googlePlaceId,
      company_name: input.companyName,
      phone: input.phone,
      address: input.address,
      niche: input.niche,
      city: input.city,
      website_url: input.websiteUrl,
      google_maps_url: input.googleMapsUrl,
      rating: input.rating,
      review_count: input.reviewCount,
      email: input.email,
      instagram: input.instagram,
      facebook_id: input.facebookId,
      twitter: input.twitter,
      latitude: input.latitude,
      longitude: input.longitude,
      source: input.source,
      source_ref: input.sourceRef ?? manualSourceReference(input),
      slug: createLeadSlug(input.companyName),
      created_by: userId,
    })
    .select("id, status")
    .single();

  if (insertError?.code === "23505") {
    return errorResponse(
      "lead_already_exists",
      "Esta empresa já está salva no seu CRM.",
      409,
    );
  }

  if (insertError || !lead) {
    return errorResponse(
      "lead_creation_failed",
      "Não foi possível salvar esta empresa no CRM.",
      500,
    );
  }

  return Response.json(
    { data: { id: lead.id, status: lead.status } },
    {
      status: 201,
      headers: { Location: `/api/v1/leads/${lead.id}` },
    },
  );
}

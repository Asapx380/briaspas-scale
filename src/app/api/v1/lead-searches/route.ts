import { createClient } from "@/lib/supabase/server";
import { isGooglePlacesConfigured } from "@/lib/google-places/env";
import {
  GooglePlacesRequestError,
  searchPlaces,
} from "@/lib/google-places/search-text";
import { isFoursquareConfigured } from "@/lib/foursquare/env";
import {
  FoursquareRequestError,
  searchFoursquarePlaces,
} from "@/lib/foursquare/search-places";
import {
  DEFAULT_LEAD_SEARCH_LIMIT,
  MAX_LEAD_SEARCH_LIMIT,
} from "@/lib/lead-sources/search-limits";
import type { LeadSearchInput } from "@/lib/lead-sources/types";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

type ErrorCode =
  | "invalid_json"
  | "validation_error"
  | "unauthorized"
  | "places_not_configured"
  | "places_quota_exceeded"
  | "places_request_failed"
  | "internal_error";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function parseInput(value: unknown): LeadSearchInput | null {
  if (!value || typeof value !== "object") return null;

  const body = value as Record<string, unknown>;
  const niche = typeof body.niche === "string" ? body.niche.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const limit = body.limit === undefined ? DEFAULT_LEAD_SEARCH_LIMIT : body.limit;
  const pageToken = body.pageToken;

  if (
    niche.length < 2 ||
    niche.length > 80 ||
    city.length < 2 ||
    city.length > 100 ||
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LEAD_SEARCH_LIMIT ||
    (pageToken !== undefined &&
      (typeof pageToken !== "string" || pageToken.length > 2_048))
  ) {
    return null;
  }

  return {
    niche,
    city,
    limit,
    pageToken: typeof pageToken === "string" ? pageToken : undefined,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return errorResponse(
      "unauthorized",
      "Entre na sua conta para pesquisar empresas.",
      401,
    );
  }

  const userId = data.claims.sub;
  if (typeof userId !== "string") return errorResponse("unauthorized", "Entre na sua conta para pesquisar empresas.", 401);
  const rateLimit = checkRateLimit(`lead-search:${userId}`, { limit: 20, windowMs: 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

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
      `Informe um nicho, uma cidade e um limite entre 1 e ${MAX_LEAD_SEARCH_LIMIT}.`,
      422,
    );
  }

  if (!isGooglePlacesConfigured() && !isFoursquareConfigured()) {
    return errorResponse(
      "places_not_configured",
      "Adicione uma chave do Google Places ou do Foursquare no arquivo .env.local.",
      503,
    );
  }

  try {
    const result = isGooglePlacesConfigured()
      ? await searchPlaces(input)
      : await searchFoursquarePlaces(input);
    return Response.json({ data: result });
  } catch (requestError) {
    if (requestError instanceof GooglePlacesRequestError && isFoursquareConfigured()) {
      try {
        const fallback = await searchFoursquarePlaces(input);
        return Response.json({ data: fallback });
      } catch {
        // O tratamento abaixo devolve o erro original do provedor principal.
      }
    }

    if (requestError instanceof GooglePlacesRequestError) {
      if (requestError.upstreamStatus === 429) {
        return errorResponse(
          "places_quota_exceeded",
          "A cota diária da Google Maps Demo Key foi atingida.",
          429,
        );
      }

      return errorResponse(
        "places_request_failed",
        requestError.upstreamStatus === 401 || requestError.upstreamStatus === 403
          ? "A Google Maps Demo Key não foi aceita ou não permite esta consulta."
          : "O Google Places não conseguiu concluir a pesquisa.",
        502,
      );
    }

    if (requestError instanceof FoursquareRequestError) {
      if (requestError.upstreamStatus === 429) {
        return errorResponse(
          "places_quota_exceeded",
          "A cota do Foursquare foi atingida. Tente novamente mais tarde.",
          429,
        );
      }

      return errorResponse(
        "places_request_failed",
        requestError.upstreamStatus === 401
          ? "A chave do Foursquare é inválida ou não está ativa."
          : "O Foursquare não conseguiu concluir a pesquisa.",
        502,
      );
    }

    if (requestError instanceof Error && requestError.name === "TimeoutError") {
      return errorResponse(
        "places_request_failed",
        "O Foursquare demorou demais para responder.",
        504,
      );
    }

    return errorResponse("internal_error", "Não foi possível pesquisar empresas.", 500);
  }
}

import {
  GeneratedSiteContentError,
  InvalidGeneratedSiteError,
  type GeneratedSiteValidationIssue,
  type GeneratedSiteValidationStage,
} from "./generated-site-validation";
import { classifyProviderQuotaKind } from "./provider-quota";

export type { GeneratedSiteValidationIssue, GeneratedSiteValidationStage };

export function formatValidationIssuesForRetry(issues: GeneratedSiteValidationIssue[]) {
  return issues.map((issue) => `[${issue.code}] ${issue.message}`);
}

export function readHtmlRejectionIssues(error: unknown): GeneratedSiteValidationIssue[] {
  if (error instanceof GeneratedSiteContentError) return error.issues;
  if (error instanceof InvalidGeneratedSiteError && error.issues.length > 0) {
    return error.issues;
  }
  return [];
}

const PROVIDER_REQUEST_ERROR_NAMES = new Set([
  "GroqRequestError",
  "OpenAiRequestError",
  "GeminiRequestError",
  "OpenRouterRequestError",
]);

function classifyProviderFailureKind(error: unknown, name: string, status: number | undefined, message: string) {
  if (name === "DailyQuotaExhaustedError" || classifyProviderQuotaKind(error) === "daily") {
    return "daily_quota" as const;
  }
  if (classifyProviderQuotaKind(error) === "tpm") return "tpm" as const;
  if (status === 401 || status === 403) return "auth" as const;
  if (status === 429 || /rate[\s_-]?limit|resource[\s_-]?exhausted/i.test(message)) {
    return "rate_limit" as const;
  }
  if (name === "TimeoutError" || name === "AbortError" || status === 408 || status === 504) {
    return "timeout" as const;
  }
  if (status === 500 || status === 502 || status === 503 || status === 529) return "capacity" as const;
  return "upstream" as const;
}

export function classifySampleGenerationFailure(error: unknown) {
  const name = error instanceof Error ? error.name : "erro_desconhecido";
  const groq = error as { upstreamStatus?: number; name?: string };
  const message = error instanceof Error ? error.message : "";
  if (
    PROVIDER_REQUEST_ERROR_NAMES.has(name) ||
    name === "TimeoutError" ||
    name === "AbortError" ||
    name === "DailyQuotaExhaustedError"
  ) {
    const status = typeof groq.upstreamStatus === "number" ? groq.upstreamStatus : undefined;
    const retryAfterSeconds =
      typeof (groq as { retryAfterSeconds?: number }).retryAfterSeconds === "number"
        ? (groq as { retryAfterSeconds: number }).retryAfterSeconds
        : undefined;
    return {
      failureKind: "provider" as const,
      error: name,
      providerHttpStatus: status,
      providerRetryAfterSeconds: retryAfterSeconds,
      providerFailure: classifyProviderFailureKind(error, name, status, message),
    };
  }

  const validatorIssues = readHtmlRejectionIssues(error);
  if (validatorIssues.length > 0) {
    const stage =
      error instanceof InvalidGeneratedSiteError
        ? error.stage
        : error instanceof GeneratedSiteContentError
          ? "content"
          : "unknown";
    return {
      failureKind: "html_validation" as const,
      error: name,
      validatorStage: stage,
      validatorIssues,
    };
  }

  return {
    failureKind: "unknown" as const,
    error: name,
  };
}

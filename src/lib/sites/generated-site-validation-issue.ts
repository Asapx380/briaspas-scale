import {
  GeneratedSiteContentError,
  InvalidGeneratedSiteError,
  type GeneratedSiteValidationIssue,
  type GeneratedSiteValidationStage,
} from "./generated-site-validation";

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

export function classifySampleGenerationFailure(error: unknown) {
  const name = error instanceof Error ? error.name : "erro_desconhecido";
  const groq = error as { upstreamStatus?: number; name?: string };
  if (name === "GroqRequestError" || name === "OpenAiRequestError" || name === "GeminiRequestError") {
    const status = typeof groq.upstreamStatus === "number" ? groq.upstreamStatus : undefined;
    return {
      failureKind: "provider" as const,
      error: name,
      providerHttpStatus: status,
      providerFailure:
        status === 401 || status === 403
          ? "auth"
          : status === 429
            ? "rate_limit"
            : "upstream",
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

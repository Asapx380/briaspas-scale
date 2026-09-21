import { describe, expect, it } from "vitest";
import {
  GeneratedSiteContentError,
  InvalidGeneratedSiteError,
} from "./generated-site-validation";
import {
  buildHtmlGenerationUserPrompt,
} from "./process-generated-site-html";
import {
  classifySampleGenerationFailure,
  formatValidationIssuesForRetry,
} from "./generated-site-validation-issue";
import { DailyQuotaExhaustedError } from "./provider-quota";

describe("generated-site-validation-issue", () => {
  it("formata códigos para o retry", () => {
    const lines = formatValidationIssuesForRetry([
      { code: "semantic.hero", message: "Falta a seção hero." },
    ]);
    expect(lines[0]).toBe("[semantic.hero] Falta a seção hero.");
  });

  it("reaplica o prompt base com erros específicos na segunda tentativa", () => {
    const prompt = buildHtmlGenerationUserPrompt("prompt-base", 2, [
      { code: "html.doctype", message: "Falta doctype." },
    ]);
    expect(prompt.startsWith("prompt-base")).toBe(true);
    expect(prompt).toContain("[html.doctype] Falta doctype.");
  });

  it("classifica falha de provedor sem expor mensagem upstream", () => {
    const providerError = Object.assign(new Error("upstream"), {
      name: "GroqRequestError",
      upstreamStatus: 429,
      upstreamMessage: "rate limit secret",
    });
    const report = classifySampleGenerationFailure(providerError);
    expect(report.failureKind).toBe("provider");
    expect(report.providerHttpStatus).toBe(429);
    expect(report.providerFailure).toBe("rate_limit");
    expect(JSON.stringify(report)).not.toContain("secret");
  });

  it("classifica OpenRouterRequestError com status HTTP", () => {
    const report = classifySampleGenerationFailure(
      Object.assign(new Error("A geração do site pela OpenRouter falhou: Rate limit exceeded"), {
        name: "OpenRouterRequestError",
        upstreamStatus: 429,
      }),
    );
    expect(report.failureKind).toBe("provider");
    expect(report.error).toBe("OpenRouterRequestError");
    expect(report.providerHttpStatus).toBe(429);
    expect(report.providerFailure).toBe("rate_limit");
    expect(JSON.stringify(report)).not.toContain("Rate limit exceeded");
  });

  it("classifica rejeição do validador com issues", () => {
    const error = new GeneratedSiteContentError([
      { code: "semantic.header", message: "Falta header." },
    ]);
    const report = classifySampleGenerationFailure(error);
    expect(report.failureKind).toBe("html_validation");
    expect(report.validatorStage).toBe("content");
    expect(report.validatorIssues).toEqual([
      { code: "semantic.header", message: "Falta header." },
    ]);
  });

  it("classifica cota diária OpenRouter sem mensagem de billing no relatório", () => {
    const report = classifySampleGenerationFailure(
      new DailyQuotaExhaustedError(["openrouter"]),
    );
    expect(report.failureKind).toBe("provider");
    expect(report.error).toBe("DailyQuotaExhaustedError");
    expect(report.providerFailure).toBe("daily_quota");
    expect(JSON.stringify(report)).not.toContain("credits");
  });

  it("classifica Groq TPM", () => {
    const report = classifySampleGenerationFailure(
      Object.assign(new Error("Limit 8000 TPM, Used 5700, Requested 5300. Please try again in 7.32s."), {
        name: "GroqRequestError",
        upstreamStatus: 429,
      }),
    );
    expect(report.providerFailure).toBe("tpm");
  });

  it("classifica falha de segurança do HTML", () => {
    const error = new InvalidGeneratedSiteError(
      [{ code: "html.meta_viewport", message: "Falta viewport." }],
      "security",
    );
    const report = classifySampleGenerationFailure(error);
    expect(report.failureKind).toBe("html_validation");
    expect(report.validatorStage).toBe("security");
  });
});

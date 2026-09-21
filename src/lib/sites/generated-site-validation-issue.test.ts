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

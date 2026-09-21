import { describe, expect, it } from "vitest";
import {
  buildGeneratedSiteRetryPromptSuffix,
  buildHtmlGenerationUserPrompt,
} from "./process-generated-site-html";

describe("processGeneratedSiteHtml", () => {
  it("inclui erros do validador no sufixo de retry", () => {
    const suffix = buildGeneratedSiteRetryPromptSuffix(["Falta a seção hero."]);
    expect(suffix).toContain("Falta a seção hero.");
  });

  it("prioriza erros de conteúdo no segundo prompt", () => {
    const prompt = buildHtmlGenerationUserPrompt("base", 2, ["Erro A"]);
    expect(prompt).toContain("Erro A");
    expect(prompt.startsWith("base")).toBe(true);
  });

  it("usa mensagem genérica quando não há erros de conteúdo", () => {
    const prompt = buildHtmlGenerationUserPrompt("base", 2, null);
    expect(prompt).toContain("validação automática");
  });
});

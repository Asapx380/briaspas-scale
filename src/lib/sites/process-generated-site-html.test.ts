import { describe, expect, it } from "vitest";
import { buildHtmlGenerationUserPrompt } from "./process-generated-site-html";

describe("processGeneratedSiteHtml", () => {
  it("reaplica o prompt base com códigos do validador na segunda tentativa", () => {
    const prompt = buildHtmlGenerationUserPrompt("base", 2, [
      { code: "semantic.hero", message: "Falta a seção hero." },
    ]);
    expect(prompt).toContain("base");
    expect(prompt).toContain("[semantic.hero] Falta a seção hero.");
  });

  it("usa mensagem genérica quando não há issues estruturadas", () => {
    const prompt = buildHtmlGenerationUserPrompt("base", 2, null);
    expect(prompt).toContain("validação automática");
  });
});

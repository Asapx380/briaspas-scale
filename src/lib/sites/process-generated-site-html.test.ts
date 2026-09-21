import { describe, expect, it } from "vitest";
import type { DesignPlan } from "./design-plan";
import {
  buildHtmlGenerationUserPrompt,
  buildHtmlPromptWithValidatedDesignPlan,
  visualDesignPlanForHtml,
} from "./process-generated-site-html";

const plan = {
  resumoDoNegocio: "Negócio local fictício para testes automatizados do plano visual.",
  tomDeVoz: "direto",
  paletteName: "Azul confiança",
  colors: {
    background: "#f4f7fa",
    surface: "#ffffff",
    primary: "#176b87",
    accent: "#e58b32",
    text: "#1d2935",
    textMuted: "#526270",
  },
  typography: {
    display: "Outfit",
    body: "Inter",
    pairingRationale: "Títulos marcantes com leitura clara no corpo.",
  },
  layoutConcept: "Estrutura responsiva com contato em destaque.",
  principles: [
    "Hierarquia visual acessível",
    "Contato direto em destaque",
    "Dados reais sem afirmações inventadas",
  ],
  servicosSugeridos: [
    { nome: "Clareamento Dental", microbeneficio: "Possibilidade de clarear o sorriso." },
    { nome: "Implantes", microbeneficio: "Possibilidade de substituir dentes." },
    { nome: "Ortodontia Invisível", microbeneficio: "Possibilidade de alinhar dentes." },
    { nome: "Facetas", microbeneficio: "Possibilidade de cobrir o esmalte." },
  ],
  diferenciais: [
    "Equipe especializada com tecnologia de ponta",
    "Atendimento humanizado e estacionamento próprio",
  ],
  ctaPrincipal: "Solicite informações",
  fotoSugerida: null,
} satisfies DesignPlan;

describe("processGeneratedSiteHtml", () => {
  it("reaplica o prompt base com códigos do validador na segunda tentativa", () => {
    const prompt = buildHtmlGenerationUserPrompt("base", 2, [
      { code: "content.invented_service_catalog", message: "Sem catálogo inventado." },
    ]);
    expect(prompt).toContain("base");
    expect(prompt).toContain("[content.invented_service_catalog] Sem catálogo inventado.");
    expect(prompt).toContain("sem catálogo de serviços, pagamentos, promessas de resultado ou diferenciais factuais");
    expect(prompt).toContain("contraste AA no hero");
  });

  it("usa mensagem genérica quando não há issues estruturadas", () => {
    const prompt = buildHtmlGenerationUserPrompt("base", 2, null);
    expect(prompt).toContain("validação automática");
  });

  it("omite catálogo e diferenciais do plano visual injetado no HTML", () => {
    const visual = visualDesignPlanForHtml(plan);
    expect(visual).not.toHaveProperty("servicosSugeridos");
    expect(visual).not.toHaveProperty("diferenciais");
    expect(visual.colors.primary).toBe("#176b87");

    const prompt = buildHtmlPromptWithValidatedDesignPlan("prompt-base", plan);
    expect(prompt).toContain("prompt-base");
    expect(prompt).not.toContain("Clareamento Dental");
    expect(prompt).not.toContain('"servicosSugeridos"');
    expect(prompt).not.toContain('"diferenciais"');
    expect(prompt).toContain("Não copie servicosSugeridos nem diferenciais");
    expect(prompt).toContain("contraste AA contra qualquer fundo ou gradiente");
  });
});

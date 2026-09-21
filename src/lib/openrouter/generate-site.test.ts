import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildLeadMapEmbedUrl,
  buildLeadWhatsAppUrl,
  type LeadSiteInput,
} from "@/lib/sites/build-generation-prompt";
import { GeneratedSiteContentError } from "@/lib/sites/generated-site-validation";
import * as siteHtmlPipeline from "@/lib/sites/process-generated-site-html";
import { generateDesignPlan, generateLeadSite } from "./generate-site";

const designPlanPayload = {
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
    { nome: "Atendimento inicial", microbeneficio: "Possibilidade de entender necessidades." },
    { nome: "Orientação", microbeneficio: "Possibilidade de esclarecer dúvidas." },
    { nome: "Serviço especializado", microbeneficio: "Possibilidade de consultar opções." },
    { nome: "Acompanhamento", microbeneficio: "Possibilidade de confirmar suporte." },
  ],
  diferenciais: [
    "Confirmar formas de atendimento disponíveis",
    "Perguntar sobre prazos e condições antes de contratar",
  ],
  ctaPrincipal: "Solicite informações",
  fotoSugerida: null,
};

const demoLead: LeadSiteInput = {
  companyName: "Petshop Amigo — Dados demonstrativos",
  category: "petshop",
  phone: "(11) 91234-5678",
  address: "Rua das Palmeiras, 45, Campinas, SP",
  instagram: "https://instagram.com/petshop_amigo_demo",
  websiteUrl: null,
  googleMapsUrl: "https://maps.google.com/?q=Petshop+Amigo+Campinas",
  photoUrls: ["https://images.example.com/demo/petshop-fachada.jpg"],
  stockPhoto: null,
  rating: 4.7,
  reviewCount: 86,
};

function guardrailsFor(lead: LeadSiteInput) {
  return {
    whatsappUrl: buildLeadWhatsAppUrl(lead.phone),
    mapEmbedUrl: buildLeadMapEmbedUrl(lead.address),
    photoUrls: lead.photoUrls,
    externalUrls: [lead.instagram, lead.websiteUrl, lead.googleMapsUrl].filter(
      (url): url is string => Boolean(url),
    ),
  };
}

function chatCompletion(content: string) {
  return Response.json({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  });
}

function readValidMinimalFixture() {
  return readFileSync(
    path.join(process.cwd(), "src/lib/sites/fixtures/generated-site-validation/valid-minimal.html"),
    "utf8",
  );
}

function withSecurityHead(html: string) {
  return html.replace(
    "<head>",
    `<head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#176b87" />
    <style>:focus-visible { outline: 2px solid #176b87; } @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }</style>`,
  );
}

describe("openrouter generate-site HTTP 429", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key-demo");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("propaga upstreamStatus e Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "Rate limit exceeded" } },
          { status: 429, headers: { "Retry-After": "42" } },
        ),
      ),
    );

    await expect(generateDesignPlan("briefing")).rejects.toMatchObject({
      name: "OpenRouterRequestError",
      upstreamStatus: 429,
      retryAfterSeconds: 42,
    });
  });
});

describe("openrouter generateLeadSite pipeline", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key-demo");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("processGeneratedSiteHtml rejeita dois h1 e horário inventado com lead e guardrails", () => {
    const guardrails = guardrailsFor(demoLead);
    const wa = guardrails.whatsappUrl!;
    const invalidHtml = withSecurityHead(readValidMinimalFixture())
      .replace(
        "<h1>Cuidado com carinho para seu pet</h1>",
        "<h1>Cuidado com carinho para seu pet</h1><h1>Segundo título proibido</h1>",
      )
      .replace(
        "<p>Atendimento de petshop. Fale pelo WhatsApp para confirmar disponibilidade.</p>",
        "<p>Atendimento de petshop. Fale pelo WhatsApp para confirmar disponibilidade.</p><p>Funcionamos de segunda a sexta, das 9h às 18h.</p>",
      )
      .replaceAll("https://wa.me/5511912345678", wa);

    expect(() =>
      siteHtmlPipeline.processGeneratedSiteHtml(invalidHtml, demoLead, guardrails),
    ).toThrow(GeneratedSiteContentError);

    try {
      siteHtmlPipeline.processGeneratedSiteHtml(invalidHtml, demoLead, guardrails);
    } catch (error) {
      expect(error).toBeInstanceOf(GeneratedSiteContentError);
      const issues = (error as GeneratedSiteContentError).issues.map((issue) => issue.code);
      expect(issues).toContain("semantic.h1_count");
      expect(issues).toContain("content.hours_without_data");
    }
  });

  it("usa processGeneratedSiteHtml com lead e guardrails e reenvia issues na segunda tentativa", async () => {
    const guardrails = guardrailsFor(demoLead);
    const contentIssues = [
      {
        code: "semantic.h1_count",
        message: "Use exatamente um h1 no documento.",
      },
      {
        code: "content.hours_without_data",
        message: "O HTML menciona horário de funcionamento sem esse dado no lead.",
      },
    ];
    const acceptedHtml = withSecurityHead(readValidMinimalFixture()).replaceAll(
      "https://wa.me/5511912345678",
      guardrails.whatsappUrl!,
    );

    const processSpy = vi.spyOn(siteHtmlPipeline, "processGeneratedSiteHtml");
    processSpy
      .mockImplementationOnce((raw, lead, allowlist) => {
        expect(lead).toEqual(demoLead);
        expect(allowlist).toEqual(guardrails);
        expect(raw).toBe("<html-bruto-do-modelo/>");
        throw new GeneratedSiteContentError(contentIssues);
      })
      .mockReturnValueOnce(acceptedHtml);

    const htmlUserMessages: string[] = [];
    let htmlCalls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as {
          response_format?: unknown;
          messages: Array<{ role: string; content: string }>;
        };
        if (body.response_format) {
          return chatCompletion(JSON.stringify(designPlanPayload));
        }
        htmlCalls += 1;
        htmlUserMessages.push(body.messages.find((message) => message.role === "user")?.content ?? "");
        return chatCompletion("<html-bruto-do-modelo/>");
      }),
    );

    const result = await generateLeadSite("prompt-base", "design-prompt", demoLead, guardrails);

    expect(processSpy).toHaveBeenCalledTimes(2);
    expect(processSpy.mock.calls[0]?.[1]).toEqual(demoLead);
    expect(processSpy.mock.calls[0]?.[2]).toEqual(guardrails);
    expect(htmlCalls).toBe(2);
    expect(result.attempts.html).toBe(2);
    expect(htmlUserMessages[1]).toContain("[semantic.h1_count]");
    expect(htmlUserMessages[1]).toContain("[content.hours_without_data]");
    expect(result.html).toContain('data-site-section="hero"');
  });
});

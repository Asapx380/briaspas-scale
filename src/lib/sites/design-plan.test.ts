import { describe, expect, it } from "vitest";
import {
  normalizeDesignPlanFotoSugerida,
  parseDesignPlanPayload,
  preprocessDesignPlanPayload,
} from "./design-plan";

const basePlan = {
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
};

describe("normalizeDesignPlanFotoSugerida", () => {
  it("converte string URL em objeto com crédito padrão", () => {
    expect(normalizeDesignPlanFotoSugerida("https://images.example.com/foto.jpg")).toEqual({
      url: "https://images.example.com/foto.jpg",
      credito: "Foto sugerida pelo plano visual",
    });
  });

  it("remove valor inaproveitável", () => {
    expect(normalizeDesignPlanFotoSugerida("não é url")).toBeNull();
    expect(normalizeDesignPlanFotoSugerida({ url: "invalida" })).toBeNull();
  });

  it("preserva objeto válido", () => {
    expect(
      normalizeDesignPlanFotoSugerida({
        url: "https://images.example.com/foto.jpg",
        credito: "Foto por Autor no Pexels",
      }),
    ).toEqual({
      url: "https://images.example.com/foto.jpg",
      credito: "Foto por Autor no Pexels",
    });
  });
});

describe("preprocessDesignPlanPayload", () => {
  it("trata fotoSugerida ausente como null", () => {
    const processed = preprocessDesignPlanPayload({ ...basePlan }) as Record<string, unknown>;
    expect(processed.fotoSugerida).toBeNull();
  });

  it("aceita plano com fotoSugerida string após preprocess", () => {
    const plan = parseDesignPlanPayload({
      ...basePlan,
      fotoSugerida: "https://images.example.com/stock.jpg",
    });
    expect(plan.fotoSugerida?.url).toBe("https://images.example.com/stock.jpg");
  });
});

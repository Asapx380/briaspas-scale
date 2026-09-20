import { describe, expect, it } from "vitest";
import { OUTREACH_HOOK_MIN_CHARACTERS, outreachCopySchema } from "./outreach-schema";

describe("outreachCopySchema", () => {
  const gancho = "Uma oportunidade clara para a empresa ganhar presença local";

  it("aceita mensagem que começa pelo gancho de impacto", () => {
    const copy = outreachCopySchema.parse({
      assunto: null,
      gancho,
      mensagem: `${gancho}. Posso compartilhar uma ideia prática em cinco minutos?`,
      cta: "Conversar por cinco minutos",
      objecoesAntecipadas: [{ objecao: "Sem tempo", resposta: "Posso resumir por mensagem." }],
    });
    expect(copy.mensagem.slice(0, OUTREACH_HOOK_MIN_CHARACTERS)).toBe(gancho.slice(0, OUTREACH_HOOK_MIN_CHARACTERS));
  });

  it("recusa mensagem que esconde o gancho depois da saudação", () => {
    expect(() =>
      outreachCopySchema.parse({
        assunto: null,
        gancho,
        mensagem: `Olá! ${gancho}. Posso compartilhar uma ideia prática?`,
        cta: "Conversar por cinco minutos",
        objecoesAntecipadas: [{ objecao: "Sem tempo", resposta: "Posso resumir por mensagem." }],
      }),
    ).toThrow(/começar pelo gancho/i);
  });
});

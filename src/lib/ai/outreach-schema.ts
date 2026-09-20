import { z } from "zod";

/** Abertura longa o suficiente para comunicar valor antes da prévia do WhatsApp. */
export const OUTREACH_HOOK_MIN_CHARACTERS = 40;

export const outreachCopySchema = z.object({
  assunto: z.string().min(5).max(120).nullable(),
  mensagem: z.string().min(OUTREACH_HOOK_MIN_CHARACTERS).max(1200),
  gancho: z.string().min(OUTREACH_HOOK_MIN_CHARACTERS).max(240),
  cta: z.string().min(5).max(200),
  objecoesAntecipadas: z.array(z.object({
    objecao: z.string().min(3).max(160),
    resposta: z.string().min(10).max(320),
  })).min(1).max(4),
}).superRefine((copy, context) => {
  if (!copy.mensagem.trimStart().startsWith(copy.gancho.trim())) {
    context.addIssue({
      code: "custom",
      path: ["mensagem"],
      message: "A mensagem deve começar pelo gancho comercial.",
    });
  }
});

export type OutreachCopy = z.infer<typeof outreachCopySchema>;

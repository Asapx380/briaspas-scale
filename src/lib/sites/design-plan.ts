import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);
const font = z.enum(["Bebas Neue", "DM Serif Display", "Fraunces", "Manrope", "Outfit", "Playfair Display", "Inter", "Lato", "Nunito Sans", "Source Sans 3", "Work Sans"]);

export const designPlanSchema = z.object({
  resumoDoNegocio: z.string().min(20).max(600),
  tomDeVoz: z.string().min(3).max(100),
  paletteName: z.string().min(3).max(80),
  colors: z.object({ background: hexColor, surface: hexColor, primary: hexColor, accent: hexColor, text: hexColor, textMuted: hexColor }),
  typography: z.object({ display: font, body: font, pairingRationale: z.string().min(10).max(240) }),
  layoutConcept: z.string().min(10).max(300),
  principles: z.array(z.string().min(8).max(180)).min(3).max(6),
  servicosSugeridos: z.array(z.object({ nome: z.string().min(2).max(100), microbeneficio: z.string().min(8).max(180) })).min(4).max(6),
  diferenciais: z.array(z.string().min(12).max(240)).min(2).max(3),
  ctaPrincipal: z.string().min(3).max(100),
  fotoSugerida: z.object({ url: z.string().url(), credito: z.string().min(3).max(180) }).nullable(),
});

export type SiteBrief = z.infer<typeof designPlanSchema>;
export type DesignPlan = SiteBrief;

export function buildDesignPlanPrompt(category: string, hasPhotos: boolean) {
  return `Crie um briefing de site em JSON para um negócio brasileiro da categoria "${category}".

Use este formato exato:
{
  "resumoDoNegocio": "2 frases curtas", "tomDeVoz": "texto curto", "paletteName": "texto curto",
  "colors": { "background": "#F7F9FC", "surface": "#FFFFFF", "primary": "#145DA0", "accent": "#F4A261", "text": "#17202A", "textMuted": "#52606D" },
  "typography": { "display": "fonte permitida", "body": "fonte permitida", "pairingRationale": "1 frase curta" },
  "layoutConcept": "1 frase curta", "principles": ["Princípio visual objetivo", "Princípio de conversão objetivo", "Princípio de acessibilidade objetivo"],
  "servicosSugeridos": [{ "nome": "Nome do serviço", "microbeneficio": "Benefício possível apresentado sem afirmar um fato não confirmado" }],
  "diferenciais": ["Sugestão prática e específica para destacar o negócio", "Outra sugestão prática e específica para destacar o negócio"], "ctaPrincipal": "Solicite informações", "fotoSugerida": null
}

Fontes permitidas: Bebas Neue, DM Serif Display, Fraunces, Manrope, Outfit, Playfair Display, Inter, Lato, Nunito Sans, Source Sans 3, Work Sans.
Inclua 4 a 6 serviços e 2 ou 3 diferenciais. Todos os textos devem ser objetivos: resumo até 300 caracteres, demais campos de texto até 120 caracteres. Cores devem ter contraste legível. Evite bege com terracota, preto com um único neon e cards repetidos.
${hasPhotos ? "Há fotos reais; sugira valorizá-las." : "Não há fotos reais; use composição, cor e tipografia sem inventar imagens."}
O HTML final usará seções com data-site-section (hero, services, contact e opcionais). O layoutConcept e os principles devem orientar hierarquia clara, CTA de WhatsApp visível e blocos que possam ser omitidos quando não houver dado real.
Retorne somente objeto JSON.`;
}

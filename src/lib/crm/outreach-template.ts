import type { CrmLead } from "./types";
import { buildPublishedLeadSiteUrl, getPublicSiteOrigin } from "./public-site-url";
import { normalizeBrazilWhatsAppDigits } from "./whatsapp-phone";

export type OutreachLeadFields = Pick<
  CrmLead,
  "company_name" | "niche" | "city" | "slug" | "site_status" | "phone"
> & {
  contactName?: string | null;
};

export type NicheTemplateId =
  | "default"
  | "saude"
  | "beleza"
  | "alimentacao"
  | "automotivo"
  | "pet";

type TemplateBody = {
  opening: (ctx: TemplateContext) => string;
  value: (ctx: TemplateContext) => string;
  demo: (ctx: TemplateContext) => string;
  closing: (ctx: TemplateContext) => string;
};

type TemplateContext = {
  company: string;
  nicheLabel: string;
  city: string;
  greeting: string;
  publicSiteUrl: string | null;
};

const NICHE_TEMPLATES: Record<NicheTemplateId, TemplateBody> = {
  default: {
    opening: (ctx) =>
      `${ctx.greeting} Acompanho negócios como a ${ctx.company} em ${ctx.city} e notei uma oportunidade simples de melhorar a presença digital.`,
    value: () =>
      "Muitas empresas do segmento perdem contatos porque o cliente não encontra informações claras online antes de decidir.",
    demo: (ctx) =>
      ctx.publicSiteUrl
        ? `Montei uma prévia só para vocês avaliarem com calma: ${ctx.publicSiteUrl}`
        : "",
    closing: () => "Posso te explicar em poucos minutos, sem compromisso. Faz sentido conversarmos?",
  },
  saude: {
    opening: (ctx) =>
      `${ctx.greeting} Trabalho com clínicas e consultórios em ${ctx.city} e vi o trabalho da ${ctx.company}.`,
    value: () =>
      "Pacientes costumam pesquisar no Google antes de marcar; quando a página não transmite confiança, o agendamento esfria.",
    demo: (ctx) =>
      ctx.publicSiteUrl
        ? `Preparei um exemplo de como a ${ctx.company} poderia se apresentar online: ${ctx.publicSiteUrl}`
        : "",
    closing: () => "Se quiser, te mostro a ideia em uma conversa rápida, sem pressão.",
  },
  beleza: {
    opening: (ctx) =>
      `${ctx.greeting} Vi a ${ctx.company} no segmento de ${ctx.nicheLabel} em ${ctx.city}.`,
    value: () =>
      "Salões e estúdios que organizam serviços e horários no site costumam receber mais pedidos de agendamento pelo WhatsApp.",
    demo: (ctx) =>
      ctx.publicSiteUrl
        ? `Deixei uma prévia visual para você ver no ritmo: ${ctx.publicSiteUrl}`
        : "",
    closing: () => "Topa bater um papo de cinco minutos sobre isso?",
  },
  alimentacao: {
    opening: (ctx) =>
      `${ctx.greeting} A ${ctx.company} chamou atenção entre ${ctx.nicheLabel} em ${ctx.city}.`,
    value: () =>
      "Cardápio, horário e local fáceis de encontrar ajudam quem está decidindo onde comer ou pedir.",
    demo: (ctx) =>
      ctx.publicSiteUrl
        ? `Montei uma página de demonstração para vocês conferirem: ${ctx.publicSiteUrl}`
        : "",
    closing: () => "Posso te mostrar a proposta sem compromisso. Combina uma conversa curta?",
  },
  automotivo: {
    opening: (ctx) =>
      `${ctx.greeting} Acompanho oficinas e serviços automotivos em ${ctx.city}, incluindo a ${ctx.company}.`,
    value: () =>
      "Motoristas pesquisam confiança e serviços antes de ir; uma página clara reduz dúvida na hora de ligar.",
    demo: (ctx) =>
      ctx.publicSiteUrl
        ? `Deixei uma prévia do que dá para fazer na web: ${ctx.publicSiteUrl}`
        : "",
    closing: () => "Se fizer sentido, explico em poucos minutos como funciona.",
  },
  pet: {
    opening: (ctx) =>
      `${ctx.greeting} Vi a ${ctx.company} no ramo pet em ${ctx.city}.`,
    value: () =>
      "Tutores costumam comparar banho, consulta e produtos online; informação organizada facilita o primeiro contato.",
    demo: (ctx) =>
      ctx.publicSiteUrl
        ? `Preparei um site demonstrativo para avaliar: ${ctx.publicSiteUrl}`
        : "",
    closing: () => "Quer ver a ideia? Posso te explicar rapidinho, sem compromisso.",
  },
};

export function resolveNicheTemplateId(niche: string | null): NicheTemplateId {
  const n = (niche ?? "").toLowerCase();
  if (/pet\s*shop|petshop|banho e tosa|veterin|\bpet\b/.test(n)) return "pet";
  if (/dent|odont|clínic|clinic|médic|medic|fisioter|psicolog/.test(n)) return "saude";
  if (/barbear|estétic|estetic|salão|salao|beleza|manicure|spa/.test(n)) return "beleza";
  if (/restaur|café|cafe|padari|lanchonete|bar\b|food|pizz/.test(n)) return "alimentacao";
  if (/mecân|mecan|auto|oficina|automot/.test(n)) return "automotivo";
  return "default";
}

function buildGreeting(company: string, contactName?: string | null): string {
  const first = contactName?.trim().split(/\s+/)[0];
  if (first) return `Olá, ${first}!`;
  return `Olá, equipe da ${company}!`;
}

export function isOutreachSiteReady(siteStatus: CrmLead["site_status"]): boolean {
  return siteStatus === "published";
}

export type BuildOutreachMessageResult = {
  text: string;
  whatsappDigits: string | null;
  publicSiteUrl: string | null;
  siteReady: boolean;
  templateId: NicheTemplateId;
};

export function buildOutreachMessage(
  lead: OutreachLeadFields,
  options?: { siteOrigin?: string },
): BuildOutreachMessageResult {
  const siteOrigin = (options?.siteOrigin ?? getPublicSiteOrigin()).replace(/\/$/, "");
  const siteReady = isOutreachSiteReady(lead.site_status);
  const publicSiteUrl = siteReady ? buildPublishedLeadSiteUrl(siteOrigin, lead.slug) : null;
  const company = lead.company_name.trim() || "sua empresa";
  const nicheLabel = lead.niche?.trim() || "seu segmento";
  const city = lead.city?.trim() || "sua cidade";
  const templateId = resolveNicheTemplateId(lead.niche);
  const template = NICHE_TEMPLATES[templateId];
  const ctx: TemplateContext = {
    company,
    nicheLabel,
    city,
    greeting: buildGreeting(company, lead.contactName),
    publicSiteUrl,
  };

  const parts = [template.opening(ctx), template.value(ctx)];
  const demo = template.demo(ctx);
  if (demo) parts.push(demo);
  parts.push(template.closing(ctx));

  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  const whatsappDigits = normalizeBrazilWhatsAppDigits(lead.phone);

  return {
    text,
    whatsappDigits,
    publicSiteUrl,
    siteReady,
    templateId,
  };
}

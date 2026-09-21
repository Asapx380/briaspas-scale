import type { LeadSiteInput } from "./build-generation-prompt";

type ContentIssue = { code: string; message: string };

function extractVisibleText(html: string) {
  const withoutExecutable = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  return withoutExecutable.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractSectionInnerHtml(html: string, sectionId: string) {
  const pattern = new RegExp(
    `<section\\b[^>]*\\bdata-site-section\\s*=\\s*(["'])${sectionId}\\1[^>]*>([\\s\\S]*?)</section>`,
    "i",
  );
  return html.match(pattern)?.[2] ?? null;
}

function leadFactHaystack(lead: LeadSiteInput) {
  return [
    lead.companyName,
    lead.category,
    lead.address,
    lead.instagram,
    lead.websiteUrl,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();
}

function phraseAllowedByLead(phrase: string, lead: LeadSiteInput) {
  const normalized = phrase.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length < 2) return true;
  return leadFactHaystack(lead).includes(normalized);
}

const PAYMENT_PATTERNS: RegExp[] = [
  /\bformas?\s+de\s+pagamento\b/i,
  /\baceita(?:mos)?\s+(?:pix|cart[aã]o|boleto|conv[eê]nio|dinheiro)\b/i,
  /\bpag(?:amento)?\s+(?:no\s+)?pix\b/i,
  /\bpix\b/i,
  /\bboleto\b/i,
  /\bcart[oõ]es?\s+de\s+(?:cr[eé]dito|d[eé]bito)\b/i,
  /\bcr[eé]dito\s+(?:em\s+)?at[eé]\s+\d/i,
  /\bparcelamos\b/i,
  /\bparcelamento\b/i,
  /\bem\s+at[eé]\s+\d+\s+vezes\b/i,
  /\bconv[eê]nios?\b/i,
  /\btransfer[eê]ncia\s+banc[aá]ria\b/i,
];

const RESULT_PROMISE_PATTERNS: RegExp[] = [
  /\bgarantimos\b/i,
  /\bresultado(?:s)?\s+garantido/i,
  /\bresultados?\s+(?:vis[ií]veis|imediatos|comprovados|duradouros)\b/i,
  /\bsorriso\s+perfeito\b/i,
  /\btransforme\s+seu\s+sorriso\b/i,
  /\btecnologia\s+(?:de\s+ponta|avan[cç]ada|moderna)\b/i,
  /\bscanner\s+intraoral\b/i,
  /\braio[-\s]?x\s+digital\b/i,
  /\bmicrosc[oó]pio\b/i,
  /\balta\s+qualidade\b/i,
  /\batendimento\s+de\s+excel[eê]ncia\b/i,
  /\bsomos\s+especialistas\b/i,
  /\bespecialistas?\s+em\b/i,
  /\bsem\s+dor\b/i,
  /\bmais\s+branco\b/i,
  /\bsegura\s+e\s+eficaz\b/i,
  /\bseguran[cç]a\s+(?:total|absoluta|garantida)\b/i,
  /\bdura[cç][aã]o\s+de\s+\d/i,
  /\bimplantes?\s+de\s+[uú]ltima\b/i,
];

const DIFFERENTIAL_PATTERNS: RegExp[] = [
  /\bnossa\s+equipe\s+(?:especializada|qualificada|experiente)\b/i,
  /\bequipe\s+(?:especializada|qualificada|de\s+especialistas)\b/i,
  /\bmais\s+de\s+\d+\s+anos\b/i,
  /\banos\s+de\s+experi[eê]ncia\b/i,
  /\bprofissionais?\s+(?:experientes|especializados|capacitados)\b/i,
  /\bambiente\s+climatizado\b/i,
  /\bestacionamento\s+(?:pr[oó]prio|gratuito|privado)\b/i,
  /\batendimento\s+humanizado\b/i,
  /\bnossos\s+diferenciais?\b/i,
  /\bdiferenciais?\s+do\s+(?:consult[oó]rio|est[uú]dio|cl[ií]nica|neg[oó]cio)\b/i,
  /\bestrutura\s+(?:moderna|completa|de\s+ponta)\b/i,
];

const FAQ_FORBIDDEN_PATTERNS: RegExp[] = [
  ...PAYMENT_PATTERNS,
  /\bpre[cç]os?\b/i,
  /\bor[cç]amentos?\b/i,
  /\ba\s+partir\s+de\b/i,
  /R\$\s*\d/,
  /\bhor[aá]rio\s+de\s+funcionamento\b/i,
  /\bque\s+horas\s+(?:abrem|fecham|atendem)\b/i,
  /\bcancelamento\b/i,
  /\breembolso\b/i,
  /\bpol[ií]tica\s+de\b/i,
  /\bclareamento\b/i,
  /\bimplantes?\b/i,
  /\bortodontia\b/i,
  /\bfacetas?\b/i,
  /\btratamento(?:s)?\s+(?:oferecidos|dispon[ií]veis|que\s+fazemos)\b/i,
];

export function mentionsInventedPayments(text: string) {
  return PAYMENT_PATTERNS.some((pattern) => pattern.test(text));
}

export function mentionsResultOrQualityPromise(text: string) {
  return RESULT_PROMISE_PATTERNS.some((pattern) => pattern.test(text));
}

export function mentionsInventedDifferentials(text: string) {
  return DIFFERENTIAL_PATTERNS.some((pattern) => pattern.test(text));
}

function collectListCatalogItems(sectionHtml: string) {
  const items: string[] = [];
  const push = (value: string) => {
    const text = extractVisibleText(value).replace(/\s+/g, " ").trim();
    if (text.length >= 2 && text.length <= 80) items.push(text);
  };

  for (const match of sectionHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    push(match[1]);
  }
  for (const match of sectionHtml.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)) {
    push(match[1]);
  }
  for (const match of sectionHtml.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const title = match[1].match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i);
    if (title) push(title[1]);
  }
  return [...new Set(items)];
}

function looksLikeNamedServiceList(text: string) {
  const parts = text
    .split(/\s*,\s*|\s+e\s+/i)
    .map((part) => part.replace(/[.:;]+$/g, "").trim())
    .filter(Boolean);
  if (parts.length < 3) return false;
  return parts.every(
    (part) => part.length <= 40 && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}\s/-]{1,39}$/u.test(part),
  );
}

export function findInventedServiceCatalog(html: string, lead: LeadSiteInput) {
  const invented: string[] = [];
  const servicesHtml = extractSectionInnerHtml(html, "services") ?? "";
  const catalogItems = collectListCatalogItems(servicesHtml);
  for (const item of catalogItems) {
    if (!phraseAllowedByLead(item, lead)) invented.push(item);
  }

  if (invented.length >= 2) return invented;

  const servicesText = extractVisibleText(servicesHtml);
  if (looksLikeNamedServiceList(servicesText) && catalogItems.length < 2) {
    const parts = servicesText.split(/\s*,\s*|\s+e\s+/i).map((part) => part.trim());
    const extra = parts.filter((part) => !phraseAllowedByLead(part, lead));
    if (extra.length >= 3) return extra;
  }

  return invented.length >= 2 ? invented : [];
}

function collectFaqTexts(html: string) {
  const blocks: string[] = [];
  const faqHtml = extractSectionInnerHtml(html, "faq");
  if (faqHtml) blocks.push(extractVisibleText(faqHtml));

  for (const match of html.matchAll(/<(h[23]|summary|dt)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const title = extractVisibleText(match[2]);
    if (title.includes("?")) blocks.push(title);
  }

  return blocks;
}

export function faqHasUnverifiedClaims(html: string) {
  return collectFaqTexts(html).some((block) =>
    FAQ_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(block)),
  );
}

export function collectInventedContentIssues(html: string, lead: LeadSiteInput) {
  const issues: ContentIssue[] = [];
  const visibleText = extractVisibleText(html);

  const catalog = findInventedServiceCatalog(html, lead);
  if (catalog.length > 0) {
    issues.push({
      code: "content.invented_service_catalog",
      message:
        "O HTML lista serviços específicos que não estão nos dados do lead. Sem catálogo verificável, omita a lista ou use só a categoria, sem nomes de tratamentos.",
    });
  }

  if (mentionsInventedPayments(visibleText)) {
    issues.push({
      code: "content.invented_payments",
      message: "O HTML menciona formas de pagamento que o lead não informou.",
    });
  }

  if (mentionsResultOrQualityPromise(visibleText)) {
    issues.push({
      code: "content.result_promise",
      message:
        "O HTML faz promessas de resultado, qualidade ou tecnologia sem campo correspondente no lead.",
    });
  }

  if (mentionsInventedDifferentials(visibleText)) {
    issues.push({
      code: "content.invented_differentials",
      message: "O HTML afirma diferenciais factuais (equipe, experiência, estrutura) sem fonte no lead.",
    });
  }

  if (faqHasUnverifiedClaims(html)) {
    issues.push({
      code: "content.faq_unverified",
      message:
        "O FAQ só pode ter perguntas neutras e respostas operacionais verificáveis (ex.: confirmar disponibilidade pelo WhatsApp). Sem pagamentos, preços, horários, tratamentos ou políticas não fornecidas.",
    });
  }

  return issues;
}

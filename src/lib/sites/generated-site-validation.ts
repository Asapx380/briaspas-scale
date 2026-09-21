import {
  buildLeadMapEmbedUrl,
  buildLeadWhatsAppUrl,
  type LeadSiteInput,
} from "./build-generation-prompt";
import type { DesignPlan } from "./design-plan";
import type { GeneratedSiteAllowlist } from "./sanitize-generated-html";

/** Recorte explícito dos campos do lead usados na validação do HTML gerado. */
export type GeneratedSiteLeadFacts = LeadSiteInput;

const REQUIRED_SITE_SECTIONS = ["hero", "services", "contact"] as const;

const CONDITIONAL_SITE_SECTIONS: Record<
  string,
  (lead: GeneratedSiteLeadFacts) => boolean
> = {
  "social-proof": (lead) => lead.rating !== null && lead.reviewCount !== null,
  gallery: (lead) => lead.photoUrls.length > 0,
  location: (lead) => Boolean(lead.address?.trim()),
};

const PLACEHOLDER_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\blorem\b/i, message: "O HTML contém texto placeholder \"lorem\"." },
  { pattern: /\{\{[\s\S]*?\}\}/, message: "O HTML contém chaves de template {{ }}." },
  { pattern: /\bTODO\b/, message: "O HTML contém marcador TODO." },
  { pattern: /\bplaceholder\b/i, message: "O HTML contém a palavra \"placeholder\"." },
];

const HOUR_PATTERNS: RegExp[] = [
  /\b\d{1,2}\s*:\s*\d{2}\b/,
  /\b\d{1,2}h(?:\d{2})?\b/i,
  /\bhor[aá]rio\b/i,
  /\bsegunda\b.*\bsexta\b/i,
  /\bdomingo\b/i,
];

const MAX_HTML_SIZE = 120_000;

export class InvalidGeneratedSiteError extends Error {
  constructor() {
    super("A IA devolveu um site inválido ou inseguro.");
    this.name = "InvalidGeneratedSiteError";
  }
}

export class GeneratedSiteContentError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(errors.join(" "));
    this.name = "GeneratedSiteContentError";
    this.errors = errors;
  }
}

export function stripMarkdownFence(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  return (match?.[1] ?? trimmed).trim();
}

function readAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2]?.trim() ?? null;
}

export function validateHtml(value: string) {
  const html = stripMarkdownFence(value);
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const hasMeta = (name: string) =>
    metaTags.some(
      (tag) =>
        readAttribute(tag, "name")?.toLowerCase() === name &&
        Boolean(readAttribute(tag, "content")),
    );
  const hasImageWithoutAlt = imageTags.some(
    (tag) => (readAttribute(tag, "alt")?.length ?? 0) < 8,
  );
  const iframeMarkers = html.match(/<iframe\b/gi) ?? [];
  const iframeTags = html.match(/<iframe\b[^>]*>/gi) ?? [];
  const iframeClosings = html.match(/<\/iframe>/gi) ?? [];
  const iframeStructureIsInvalid =
    iframeMarkers.length > 1 ||
    iframeMarkers.length !== iframeTags.length ||
    iframeMarkers.length !== iframeClosings.length;
  const hasUnsafeIframe = iframeTags.some((tag) => {
    if (/\bsrcdoc\s*=/i.test(tag)) return true;
    const source = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!source) return true;

    try {
      const url = new URL(source.replaceAll("&amp;", "&"));
      const allowedHost = url.hostname === "www.google.com" || url.hostname === "maps.google.com";
      return (
        url.protocol !== "https:" ||
        !allowedHost ||
        url.pathname !== "/maps" ||
        url.searchParams.get("output") !== "embed"
      );
    } catch {
      return true;
    }
  });
  const forbidden = [
    /<script\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<form\b/i,
    /\bon[a-z]+\s*=/i,
    /javascript\s*:/i,
    /<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i,
  ];

  if (
    html.length === 0 ||
    html.length > MAX_HTML_SIZE ||
    !/^<!doctype html>/i.test(html) ||
    !/<html\b[^>]*\blang\s*=\s*["']pt-BR["']/i.test(html) ||
    !/<\/html>\s*$/i.test(html) ||
    !/<title\b[^>]*>\s*[^<]+\s*<\/title>/i.test(html) ||
    !hasMeta("description") ||
    !hasMeta("viewport") ||
    !hasMeta("theme-color") ||
    !/:focus-visible/i.test(html) ||
    !/prefers-reduced-motion\s*:\s*reduce/i.test(html) ||
    hasImageWithoutAlt ||
    iframeStructureIsInvalid ||
    hasUnsafeIframe ||
    forbidden.some((pattern) => pattern.test(html))
  ) {
    throw new InvalidGeneratedSiteError();
  }

  return html;
}

export function enforceLeadLinks(value: string, guardrails: GeneratedSiteAllowlist) {
  if (!guardrails.whatsappUrl) return value;

  const html = value.replace(
    /(\bhref\s*=\s*)(["'])https:\/\/wa\.me\/[^"']*\2/gi,
    (_match, prefix: string, quote: string) =>
      `${prefix}${quote}${guardrails.whatsappUrl}${quote}`,
  );
  const whatsappLinks = [
    ...html.matchAll(/\bhref\s*=\s*(["'])(https:\/\/wa\.me\/[^"']*)\1/gi),
  ];

  if (
    whatsappLinks.length < 3 ||
    whatsappLinks.some((match) => match[2] !== guardrails.whatsappUrl)
  ) {
    throw new InvalidGeneratedSiteError();
  }

  return html;
}

function colorChannels(value: string) {
  return [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255);
}

function luminance(value: string) {
  return colorChannels(value)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(first: string, second: string) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

export function validateDesignPlan(plan: DesignPlan) {
  if (
    contrastRatio(plan.colors.text, plan.colors.background) < 4.5 ||
    contrastRatio(plan.colors.text, plan.colors.surface) < 4.5
  ) {
    throw new InvalidGeneratedSiteError();
  }
  return plan;
}

function normalizeComparableUrl(value: string) {
  return value.trim().replaceAll("&amp;", "&");
}

function countTags(html: string, tag: string) {
  const open = html.match(new RegExp(`<${tag}\\b`, "gi")) ?? [];
  return open.length;
}

function extractMainInnerHtml(html: string) {
  const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return match?.[1] ?? null;
}

function readSiteSectionIds(html: string) {
  const ids: string[] = [];
  const pattern = /<section\b[^>]*\bdata-site-section\s*=\s*(["'])([^"']+)\1/gi;
  for (const match of html.matchAll(pattern)) {
    ids.push(match[2].trim().toLowerCase());
  }
  return ids;
}

function extractVisibleText(html: string) {
  const withoutExecutable = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  const text = withoutExecutable
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function collectAllowedNumberTokens(lead: GeneratedSiteLeadFacts) {
  const tokens = new Set<string>();
  const absorb = (value: string | null | undefined) => {
    if (!value) return;
    for (const match of value.matchAll(/\d+/g)) {
      if (match[0].length >= 2) tokens.add(match[0]);
    }
  };

  absorb(lead.phone);
  absorb(lead.address);
  absorb(lead.instagram);
  absorb(lead.websiteUrl);
  absorb(lead.googleMapsUrl);

  if (lead.rating !== null) {
    const ratingText = String(lead.rating);
    tokens.add(ratingText);
    tokens.add(ratingText.replace(".", ","));
    tokens.add(lead.rating.toFixed(1));
    tokens.add(lead.rating.toFixed(1).replace(".", ","));
  }

  if (lead.reviewCount !== null) {
    tokens.add(String(lead.reviewCount));
  }

  return tokens;
}

function findUnexpectedNumbers(text: string, allowed: Set<string>) {
  const unexpected: string[] = [];
  for (const match of text.matchAll(/\b\d+(?:[.,]\d+)?\b/g)) {
    const raw = match[0];
    const variants = [raw, raw.replace(",", ".")];
    const digitsOnly = raw.replace(/\D/g, "");
    const allowedByDigits = digitsOnly.length >= 2 && allowed.has(digitsOnly);
    const allowedByToken = variants.some((variant) => allowed.has(variant));
    if (!allowedByDigits && !allowedByToken) {
      unexpected.push(raw);
    }
  }
  return [...new Set(unexpected)];
}

function collectWhatsappLinks(html: string) {
  return [...html.matchAll(/\bhref\s*=\s*(["'])(https:\/\/wa\.me\/[^"']*)\1/gi)].map(
    (match) => normalizeComparableUrl(match[2]),
  );
}

function collectMapIframeSources(html: string) {
  const sources: string[] = [];
  for (const tag of html.matchAll(/<iframe\b[^>]*>/gi)) {
    const src = tag[0].match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (src) sources.push(normalizeComparableUrl(src));
  }
  return sources;
}

export function validateGeneratedSiteContent(html: string, lead: GeneratedSiteLeadFacts) {
  const errors: string[] = [];
  const document = stripMarkdownFence(html);
  const whatsappUrl = buildLeadWhatsAppUrl(lead.phone);
  const mapEmbedUrl = buildLeadMapEmbedUrl(lead.address);
  const mainHtml = extractMainInnerHtml(document);
  const sectionIds = mainHtml ? readSiteSectionIds(mainHtml) : [];

  if (countTags(document, "header") !== 1) {
    errors.push("O documento precisa de exatamente um elemento <header>.");
  }
  if (countTags(document, "main") !== 1) {
    errors.push("O documento precisa de exatamente um elemento <main>.");
  }
  if (countTags(document, "footer") !== 1) {
    errors.push("O documento precisa de exatamente um elemento <footer>.");
  }

  if (!mainHtml) {
    errors.push("O conteúdo principal precisa estar dentro de <main>.");
  } else {
    for (const sectionId of REQUIRED_SITE_SECTIONS) {
      if (!sectionIds.includes(sectionId)) {
        errors.push(
          `Falta a seção obrigatória "${sectionId}" (use <section data-site-section="${sectionId}"> dentro de <main>).`,
        );
      }
    }

    for (const [sectionId, isAllowed] of Object.entries(CONDITIONAL_SITE_SECTIONS)) {
      if (sectionIds.includes(sectionId) && !isAllowed(lead)) {
        errors.push(
          `A seção "${sectionId}" só pode aparecer quando o lead tem o dado correspondente.`,
        );
      }
    }

    if (sectionIds.includes("testimonials")) {
      errors.push("Depoimentos não fazem parte dos dados do lead; omita a seção \"testimonials\".");
    }
  }

  const h1Count = (document.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) {
    errors.push(`O documento precisa de exatamente um <h1> (encontrados: ${h1Count}).`);
  }

  for (const { pattern, message } of PLACEHOLDER_PATTERNS) {
    if (pattern.test(document)) errors.push(message);
  }

  const visibleText = extractVisibleText(document);
  for (const pattern of HOUR_PATTERNS) {
    if (pattern.test(visibleText)) {
      errors.push("O HTML menciona horário de funcionamento sem esse dado no lead.");
      break;
    }
  }

  if (/<blockquote\b/i.test(document)) {
    errors.push("O HTML contém depoimento em <blockquote>, mas o lead não fornece citações.");
  }

  const unexpectedNumbers = findUnexpectedNumbers(visibleText, collectAllowedNumberTokens(lead));
  if (unexpectedNumbers.length > 0) {
    errors.push(
      `O HTML exibe números que não vêm do lead: ${unexpectedNumbers.slice(0, 5).join(", ")}.`,
    );
  }

  const whatsappLinks = collectWhatsappLinks(document);
  if (!whatsappUrl && whatsappLinks.length > 0) {
    errors.push("O HTML inclui links wa.me, mas o lead não tem telefone/WhatsApp.");
  }
  if (whatsappUrl) {
    if (whatsappLinks.length === 0) {
      errors.push("O lead tem telefone, mas o HTML não inclui links wa.me.");
    } else if (whatsappLinks.some((link) => link !== whatsappUrl)) {
      errors.push("Algum link wa.me não corresponde ao telefone do lead.");
    }
  }

  const mapSources = collectMapIframeSources(document);
  if (!mapEmbedUrl) {
    if (mapSources.length > 0) {
      errors.push("O HTML inclui mapa incorporado, mas o lead não tem endereço.");
    }
  } else if (mapSources.some((source) => source !== mapEmbedUrl)) {
    errors.push("O iframe do mapa não corresponde ao endereço do lead.");
  } else if (sectionIds.includes("location") && mapSources.length === 0) {
    errors.push("A seção \"location\" precisa do iframe com a URL de mapa do lead.");
  }

  return errors;
}

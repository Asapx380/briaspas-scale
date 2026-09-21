import {
  buildLeadMapEmbedUrl,
  buildLeadWhatsAppUrl,
  type LeadSiteInput,
} from "./build-generation-prompt";
import type { DesignPlan } from "./design-plan";
import { collectInventedContentIssues } from "./generated-site-content-claims";
import { collectHeroContrastIssues, contrastRatio } from "./generated-site-hero-contrast";
import type { GeneratedSiteAllowlist } from "./sanitize-generated-html";

/** Recorte explícito dos campos do lead usados na validação do HTML gerado. */
export type GeneratedSiteLeadFacts = LeadSiteInput;

export type GeneratedSiteValidationIssue = {
  code: string;
  message: string;
};

export type GeneratedSiteValidationStage =
  | "security"
  | "whatsapp_links"
  | "content"
  | "design_plan"
  | "unknown";

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

const SCHEDULING_HOUR_PHRASES = [
  /\bagende\s+(o\s+|seu\s+)?hor[aá]rio\b/gi,
  /\bescolha\s+um\s+hor[aá]rio\b/gi,
  /\bagendar\s+um\s+hor[aá]rio\b/gi,
  /\bconfirme\s+hor[aá]rios\b/gi,
  /\bhor[aá]rio\s+que\s+melhor\b/gi,
];

const BUSINESS_HOUR_PATTERNS: RegExp[] = [
  /\b\d{1,2}\s*:\s*\d{2}\b/,
  /\b\d{1,2}h(?:\d{2})?\b/i,
  /\b\d{1,2}\s*h\s*[-–]\s*\d{1,2}\s*h\b/i,
  /\bhor[aá]rio\s+de\s+funcionamento\b/i,
  /\bsegunda\b.*\bsexta\b/i,
  /\bdomingo\b/i,
  /\batendemos\s+(das|de)\s+\d/i,
  /\baberto\s+(das|de)\s+\d/i,
];

function stripSchedulingHourPhrases(text: string) {
  let scrubbed = text;
  for (const pattern of SCHEDULING_HOUR_PHRASES) {
    scrubbed = scrubbed.replace(pattern, " ");
  }
  return scrubbed;
}

/** Detecta horário de funcionamento inventado, ignorando CTAs de agendamento. */
export function mentionsInventedBusinessHours(text: string) {
  const scrubbed = stripSchedulingHourPhrases(text);
  return BUSINESS_HOUR_PATTERNS.some((pattern) => pattern.test(scrubbed));
}

const MAX_HTML_SIZE = 120_000;

export class InvalidGeneratedSiteError extends Error {
  readonly stage: GeneratedSiteValidationStage;
  readonly issues: GeneratedSiteValidationIssue[];

  constructor(
    issues: GeneratedSiteValidationIssue[] = [],
    stage: GeneratedSiteValidationStage = "unknown",
  ) {
    super(
      issues.map((issue) => issue.message).join(" ") ||
        "A IA devolveu um site inválido ou inseguro.",
    );
    this.name = "InvalidGeneratedSiteError";
    this.issues = issues;
    this.stage = stage;
  }
}

export class GeneratedSiteContentError extends Error {
  readonly issues: GeneratedSiteValidationIssue[];

  constructor(issues: GeneratedSiteValidationIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "GeneratedSiteContentError";
    this.issues = issues;
  }

  get errors() {
    return this.issues.map((issue) => issue.message);
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

export function collectHtmlSecurityIssues(value: string) {
  const html = stripMarkdownFence(value);
  const issues: GeneratedSiteValidationIssue[] = [];
  const push = (code: string, message: string) => issues.push({ code, message });

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
  const forbiddenChecks: Array<{ code: string; pattern: RegExp; message: string }> = [
    { code: "html.forbidden_script", pattern: /<script\b/i, message: "Scripts não são permitidos." },
    { code: "html.forbidden_object", pattern: /<object\b/i, message: "Tags object não são permitidas." },
    { code: "html.forbidden_embed", pattern: /<embed\b/i, message: "Tags embed não são permitidas." },
    { code: "html.forbidden_form", pattern: /<form\b/i, message: "Formulários não são permitidos." },
    {
      code: "html.forbidden_inline_handler",
      pattern: /\bon[a-z]+\s*=/i,
      message: "Atributos de evento inline não são permitidos.",
    },
    {
      code: "html.forbidden_javascript_url",
      pattern: /javascript\s*:/i,
      message: "URLs javascript: não são permitidas.",
    },
    {
      code: "html.forbidden_meta_refresh",
      pattern: /<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i,
      message: "Meta refresh não é permitido.",
    },
  ];

  if (html.length === 0) push("html.empty", "O documento HTML está vazio.");
  if (html.length > MAX_HTML_SIZE) {
    push("html.size_limit", "O HTML excede o tamanho máximo permitido.");
  }
  if (!/^<!doctype html>/i.test(html)) {
    push("html.doctype", "O documento deve começar com <!doctype html>.");
  }
  if (!/<html\b[^>]*\blang\s*=\s*["']pt-BR["']/i.test(html)) {
    push("html.lang", 'O elemento <html> precisa de lang="pt-BR".');
  }
  if (!/<\/html>\s*$/i.test(html)) {
    push("html.closing", "O documento precisa terminar com </html>.");
  }
  if (!/<title\b[^>]*>\s*[^<]+\s*<\/title>/i.test(html)) {
    push("html.title", "Inclua um <title> com texto.");
  }
  if (!hasMeta("description")) {
    push("html.meta_description", 'Inclua <meta name="description" content="...">.');
  }
  if (!hasMeta("viewport")) {
    push("html.meta_viewport", 'Inclua <meta name="viewport" content="...">.');
  }
  if (!hasMeta("theme-color")) {
    push("html.meta_theme_color", 'Inclua <meta name="theme-color" content="...">.');
  }
  if (!/:focus-visible/i.test(html)) {
    push("html.focus_visible", "Inclua estilos :focus-visible no CSS.");
  }
  if (!/prefers-reduced-motion\s*:\s*reduce/i.test(html)) {
    push("html.reduced_motion", "Inclua @media (prefers-reduced-motion: reduce).");
  }
  if (hasImageWithoutAlt) {
    push("html.image_alt", "Todas as imagens precisam de alt com pelo menos 8 caracteres.");
  }
  if (iframeStructureIsInvalid) {
    push("html.iframe_structure", "Use no máximo um iframe bem formado.");
  }
  if (hasUnsafeIframe) {
    push("html.iframe_unsafe", "O iframe do mapa deve usar URL https do Google Maps em modo embed.");
  }
  for (const check of forbiddenChecks) {
    if (check.pattern.test(html)) push(check.code, check.message);
  }

  return issues;
}

export function validateHtml(value: string) {
  const issues = collectHtmlSecurityIssues(value);
  if (issues.length > 0) {
    throw new InvalidGeneratedSiteError(issues, "security");
  }
  return stripMarkdownFence(value);
}

export function collectWhatsappLinkIssues(value: string, guardrails: GeneratedSiteAllowlist) {
  const issues: GeneratedSiteValidationIssue[] = [];
  if (!guardrails.whatsappUrl) return issues;

  const html = value.replace(
    /(\bhref\s*=\s*)(["'])https:\/\/wa\.me\/[^"']*\2/gi,
    (_match, prefix: string, quote: string) =>
      `${prefix}${quote}${guardrails.whatsappUrl}${quote}`,
  );
  const whatsappLinks = [
    ...html.matchAll(/\bhref\s*=\s*(["'])(https:\/\/wa\.me\/[^"']*)\1/gi),
  ];
  if (whatsappLinks.length < 3) {
    issues.push({
      code: "whatsapp.link_count",
      message: "Inclua pelo menos três links wa.me idênticos ao whatsapp_url do lead.",
    });
  } else if (whatsappLinks.some((match) => match[2] !== guardrails.whatsappUrl)) {
    issues.push({
      code: "whatsapp.link_mismatch",
      message: "Todos os links wa.me devem usar exatamente o whatsapp_url do lead.",
    });
  }
  return issues;
}

export function enforceLeadLinks(value: string, guardrails: GeneratedSiteAllowlist) {
  const linkIssues = collectWhatsappLinkIssues(value, guardrails);
  if (linkIssues.length > 0) {
    throw new InvalidGeneratedSiteError(linkIssues, "whatsapp_links");
  }
  if (!guardrails.whatsappUrl) return value;

  return value.replace(
    /(\bhref\s*=\s*)(["'])https:\/\/wa\.me\/[^"']*\2/gi,
    (_match, prefix: string, quote: string) =>
      `${prefix}${quote}${guardrails.whatsappUrl}${quote}`,
  );
}

export function validateDesignPlan(plan: DesignPlan) {
  if (
    contrastRatio(plan.colors.text, plan.colors.background) < 4.5 ||
    contrastRatio(plan.colors.text, plan.colors.surface) < 4.5
  ) {
    throw new InvalidGeneratedSiteError(
      [{ code: "design.contrast", message: "O plano visual não atende contraste mínimo." }],
      "design_plan",
    );
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

export function collectGeneratedSiteContentIssues(html: string, lead: GeneratedSiteLeadFacts) {
  const issues: GeneratedSiteValidationIssue[] = [];
  const push = (code: string, message: string) => issues.push({ code, message });
  const document = stripMarkdownFence(html);
  const whatsappUrl = buildLeadWhatsAppUrl(lead.phone);
  const mapEmbedUrl = buildLeadMapEmbedUrl(lead.address);
  const mainHtml = extractMainInnerHtml(document);
  const sectionIds = mainHtml ? readSiteSectionIds(mainHtml) : [];

  if (countTags(document, "header") !== 1) {
    push("semantic.header", "O documento precisa de exatamente um elemento <header>.");
  }
  if (countTags(document, "main") !== 1) {
    push("semantic.main", "O documento precisa de exatamente um elemento <main>.");
  }
  if (countTags(document, "footer") !== 1) {
    push("semantic.footer", "O documento precisa de exatamente um elemento <footer>.");
  }

  if (!mainHtml) {
    push("semantic.main_content", "O conteúdo principal precisa estar dentro de <main>.");
  } else {
    for (const sectionId of REQUIRED_SITE_SECTIONS) {
      if (!sectionIds.includes(sectionId)) {
        push(
          `semantic.section_${sectionId}`,
          `Falta a seção obrigatória "${sectionId}" (use <section data-site-section="${sectionId}"> dentro de <main>).`,
        );
      }
    }

    for (const [sectionId, isAllowed] of Object.entries(CONDITIONAL_SITE_SECTIONS)) {
      if (sectionIds.includes(sectionId) && !isAllowed(lead)) {
        push(
          `semantic.section_${sectionId}_without_data`,
          `A seção "${sectionId}" só pode aparecer quando o lead tem o dado correspondente.`,
        );
      }
    }

    if (sectionIds.includes("testimonials")) {
      push(
        "content.testimonials_forbidden",
        "Depoimentos não fazem parte dos dados do lead; omita a seção \"testimonials\".",
      );
    }
  }

  const h1Count = (document.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) {
    push(
      "semantic.h1_count",
      `O documento precisa de exatamente um <h1> (encontrados: ${h1Count}).`,
    );
  }

  for (const { pattern, message } of PLACEHOLDER_PATTERNS) {
    if (pattern.test(document)) {
      push("content.placeholder", message);
    }
  }

  const visibleText = extractVisibleText(document);
  if (mentionsInventedBusinessHours(visibleText)) {
    push("content.hours_without_data", "O HTML menciona horário de funcionamento sem esse dado no lead.");
  }

  if (/<blockquote\b/i.test(document)) {
    push(
      "content.blockquote_forbidden",
      "O HTML contém depoimento em <blockquote>, mas o lead não fornece citações.",
    );
  }

  const unexpectedNumbers = findUnexpectedNumbers(visibleText, collectAllowedNumberTokens(lead));
  if (unexpectedNumbers.length > 0) {
    push(
      "content.unexpected_numbers",
      `O HTML exibe números que não vêm do lead: ${unexpectedNumbers.slice(0, 5).join(", ")}.`,
    );
  }

  const whatsappLinks = collectWhatsappLinks(document);
  if (!whatsappUrl && whatsappLinks.length > 0) {
    push("whatsapp.unexpected_links", "O HTML inclui links wa.me, mas o lead não tem telefone/WhatsApp.");
  }
  if (whatsappUrl) {
    if (whatsappLinks.length === 0) {
      push("whatsapp.missing_links", "O lead tem telefone, mas o HTML não inclui links wa.me.");
    } else if (whatsappLinks.some((link) => link !== whatsappUrl)) {
      push("whatsapp.link_mismatch", "Algum link wa.me não corresponde ao telefone do lead.");
    }
  }

  const mapSources = collectMapIframeSources(document);
  if (!mapEmbedUrl) {
    if (mapSources.length > 0) {
      push("map.unexpected_iframe", "O HTML inclui mapa incorporado, mas o lead não tem endereço.");
    }
  } else if (mapSources.some((source) => source !== mapEmbedUrl)) {
    push("map.iframe_mismatch", "O iframe do mapa não corresponde ao endereço do lead.");
  } else if (sectionIds.includes("location") && mapSources.length === 0) {
    push("map.missing_iframe", "A seção \"location\" precisa do iframe com a URL de mapa do lead.");
  }

  issues.push(...collectInventedContentIssues(document, lead));
  issues.push(...collectHeroContrastIssues(document));

  return issues;
}

export function validateGeneratedSiteContent(html: string, lead: GeneratedSiteLeadFacts) {
  return collectGeneratedSiteContentIssues(html, lead).map((issue) => issue.message);
}

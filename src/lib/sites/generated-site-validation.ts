import type { DesignPlan } from "@/lib/sites/design-plan";
import type { GeneratedSiteAllowlist } from "@/lib/sites/sanitize-generated-html";

const MAX_HTML_SIZE = 120_000;

export class InvalidGeneratedSiteError extends Error {
  constructor() {
    super("A IA devolveu um site inválido ou inseguro.");
    this.name = "InvalidGeneratedSiteError";
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

import {
  GeneratedSiteContentError,
  enforceLeadLinks,
  type GeneratedSiteLeadFacts,
  validateGeneratedSiteContent,
  validateHtml,
} from "./generated-site-validation";
import { sanitizeGeneratedHtml, type GeneratedSiteAllowlist } from "./sanitize-generated-html";

export function buildGeneratedSiteRetryPromptSuffix(errors: string[]) {
  return `\n\nA tentativa anterior falhou na validação de conteúdo. Corrija todos os pontos abaixo sem inventar dados:\n${errors.map((error) => `- ${error}`).join("\n")}`;
}

const GENERIC_HTML_RETRY_SUFFIX =
  "\n\nA tentativa anterior falhou na validação automática. Revise segurança, SEO, acessibilidade, marcadores data-site-section, URLs exatas e estrutura antes de responder.";

export function buildHtmlGenerationUserPrompt(
  htmlPrompt: string,
  attempt: number,
  contentErrors: string[] | null,
) {
  if (attempt === 1) return htmlPrompt;
  if (contentErrors && contentErrors.length > 0) {
    return `${htmlPrompt}${buildGeneratedSiteRetryPromptSuffix(contentErrors)}`;
  }
  return `${htmlPrompt}${GENERIC_HTML_RETRY_SUFFIX}`;
}

export function processGeneratedSiteHtml(
  rawHtml: string,
  lead: GeneratedSiteLeadFacts,
  guardrails: GeneratedSiteAllowlist,
) {
  const linked = enforceLeadLinks(rawHtml, guardrails);
  const sanitized = sanitizeGeneratedHtml(linked, guardrails);
  const html = validateHtml(sanitized);
  const contentErrors = validateGeneratedSiteContent(html, lead);
  if (contentErrors.length > 0) {
    throw new GeneratedSiteContentError(contentErrors);
  }
  return html;
}

import {
  formatValidationIssuesForRetry,
  type GeneratedSiteValidationIssue,
} from "./generated-site-validation-issue";
import {
  GeneratedSiteContentError,
  collectGeneratedSiteContentIssues,
  enforceLeadLinks,
  type GeneratedSiteLeadFacts,
  validateHtml,
} from "./generated-site-validation";
import { sanitizeGeneratedHtml, type GeneratedSiteAllowlist } from "./sanitize-generated-html";

export function buildGeneratedSiteRetryPromptSuffix(issues: GeneratedSiteValidationIssue[]) {
  const lines = formatValidationIssuesForRetry(issues);
  return `\n\nA tentativa anterior falhou na validação automática. Corrija todos os pontos abaixo sem inventar dados:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

const GENERIC_HTML_RETRY_SUFFIX =
  "\n\nA tentativa anterior falhou na validação automática. Revise segurança, SEO, acessibilidade, marcadores data-site-section, URLs exatas e estrutura antes de responder.";

export function buildHtmlGenerationUserPrompt(
  htmlPrompt: string,
  attempt: number,
  validationIssues: GeneratedSiteValidationIssue[] | null,
) {
  if (attempt === 1) return htmlPrompt;
  if (validationIssues && validationIssues.length > 0) {
    return `${htmlPrompt}${buildGeneratedSiteRetryPromptSuffix(validationIssues)}`;
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
  const contentIssues = collectGeneratedSiteContentIssues(html, lead);
  if (contentIssues.length > 0) {
    throw new GeneratedSiteContentError(contentIssues);
  }
  return html;
}

import type { DesignPlan } from "./design-plan";
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

export function visualDesignPlanForHtml(plan: DesignPlan): Omit<DesignPlan, "servicosSugeridos" | "diferenciais"> {
  const visual: Omit<DesignPlan, "servicosSugeridos" | "diferenciais"> & Partial<
    Pick<DesignPlan, "servicosSugeridos" | "diferenciais">
  > = { ...plan };
  delete visual.servicosSugeridos;
  delete visual.diferenciais;
  return visual;
}

export function buildHtmlPromptWithValidatedDesignPlan(prompt: string, plan: DesignPlan) {
  return `${prompt}

<plano-visual-validado>
${JSON.stringify(visualDesignPlanForHtml(plan), null, 2)}
</plano-visual-validado>

Siga o plano visual somente para cores, fontes, composição e linguagem de formas.
Não copie servicosSugeridos nem diferenciais: o lead não tem catálogo nem diferenciais verificáveis nesses campos.
Não invente lista de serviços específicos, pagamentos, promessas de resultado ou diferenciais factuais.
No hero, texto e CTA precisam de contraste AA contra qualquer fundo ou gradiente.`;
}

export function buildGeneratedSiteRetryPromptSuffix(issues: GeneratedSiteValidationIssue[]) {
  const lines = formatValidationIssuesForRetry(issues);
  return `\n\nA tentativa anterior falhou na validação automática. Corrija todos os pontos abaixo sem inventar dados (sem catálogo de serviços, pagamentos, promessas de resultado ou diferenciais factuais; mantenha contraste AA no hero):\n${lines.map((line) => `- ${line}`).join("\n")}`;
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

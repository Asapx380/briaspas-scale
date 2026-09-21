import "server-only";

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function getOpenRouterConfig() {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
  const openRouterSiteModel = process.env.OPENROUTER_SITE_MODEL?.trim() || "openrouter/free";
  if (!openRouterApiKey) {
    throw new Error(
      "OpenRouter não configurada. Preencha OPENROUTER_API_KEY no arquivo .env.local.",
    );
  }

  return { apiKey: openRouterApiKey, model: openRouterSiteModel };
}

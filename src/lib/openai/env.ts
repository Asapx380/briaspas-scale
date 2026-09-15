const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openaiSiteModel = process.env.OPENAI_SITE_MODEL?.trim() || "gpt-5.6-terra";

export function isOpenAiConfigured() {
  return Boolean(openaiApiKey);
}

export function getOpenAiConfig() {
  if (!openaiApiKey) {
    throw new Error("OpenAI não configurada. Preencha OPENAI_API_KEY no .env.local.");
  }

  return { apiKey: openaiApiKey, model: openaiSiteModel };
}

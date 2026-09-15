const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
// A documentação atual expõe o Flash gratuito como preview; altere por variável quando mudar.
const geminiSiteModel = process.env.GEMINI_SITE_MODEL?.trim() || "gemini-3-flash-preview";

export function isGeminiConfigured() {
  return Boolean(geminiApiKey);
}

export function getGeminiConfig() {
  if (!geminiApiKey) {
    throw new Error("Gemini não configurada. Preencha GEMINI_API_KEY no .env.local.");
  }

  return { apiKey: geminiApiKey, model: geminiSiteModel };
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function getGroqConfig() {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const groqSiteModel = process.env.GROQ_SITE_MODEL?.trim() || "openai/gpt-oss-120b";
  if (!groqApiKey) {
    throw new Error(
      "Groq não configurada. Preencha GROQ_API_KEY no arquivo .env.local.",
    );
  }

  return { apiKey: groqApiKey, model: groqSiteModel };
}

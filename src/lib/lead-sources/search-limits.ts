/** Limite máximo aceito pela API de busca (alinha ao cap do Foursquare). */
export const MAX_LEAD_SEARCH_LIMIT = 50;

/** Padrão da UI de prospecção (mesmo valor que já era enviado fixo). */
export const DEFAULT_LEAD_SEARCH_LIMIT = 25;

/** Opções do seletor “Quantos leads?”. */
export const LEAD_SEARCH_LIMIT_OPTIONS = [10, 25, 50] as const;

export type LeadSearchLimitOption = (typeof LEAD_SEARCH_LIMIT_OPTIONS)[number];

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";

const CATEGORY_QUERY_MAP: Record<string, string> = {
  academia: "modern gym fitness interior",
  advocacia: "law office professional interior",
  barbearia: "barbershop interior",
  "clinica estetica": "beauty clinic spa interior",
  "clinica medica": "medical clinic modern interior",
  "clinica odontologica": "dental clinic modern",
  "consultorio odontologico": "dental clinic modern",
  coach: "business coaching meeting",
  consultor: "business consultant meeting",
  contabilidade: "accounting office professional",
  "escola de idiomas": "language school classroom",
  imobiliaria: "real estate agent modern home",
  infoprodutor: "online course creator studio",
  "loja de roupas": "fashion boutique interior",
  "oficina mecanica": "auto repair workshop",
  restaurante: "restaurant interior food",
  pizzaria: "pizzeria restaurant interior",
  "salao de beleza": "beauty salon interior",
  veterinaria: "veterinary clinic pet doctor",
  "clinica veterinaria": "veterinary clinic pet doctor",
  "hospital veterinario": "veterinary clinic pet doctor",
  petshop: "pet shop dogs cats",
  "pet shop": "pet shop dogs cats",
  "banho e tosa": "pet grooming salon",
  pilates: "pilates studio",
  padaria: "bakery shop interior",
};

export type StockPhoto = {
  url: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
};

type PexelsPhoto = {
  src?: { large?: unknown };
  photographer?: unknown;
  photographer_url?: unknown;
  url?: unknown;
};

function normalizedCategory(category: string) {
  return category
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function queryForCategory(category: string) {
  const normalized = normalizedCategory(category);
  return CATEGORY_QUERY_MAP[normalized] ?? `${category.trim()} business`;
}

function hasPexelsHost(value: unknown, hosts: string[]) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.includes(url.hostname);
  } catch {
    return false;
  }
}

function stockPhotoFrom(value: unknown): StockPhoto | null {
  if (!value || typeof value !== "object") return null;
  const photo = value as PexelsPhoto;
  if (
    !hasPexelsHost(photo.src?.large, ["images.pexels.com"])
    || !hasPexelsHost(photo.photographer_url, ["www.pexels.com", "pexels.com"])
    || !hasPexelsHost(photo.url, ["www.pexels.com", "pexels.com"])
    || typeof photo.photographer !== "string"
    || !photo.photographer.trim()
  ) {
    return null;
  }

  return {
    url: photo.src?.large as string,
    photographer: photo.photographer.trim(),
    photographerUrl: photo.photographer_url as string,
    pexelsUrl: photo.url as string,
  };
}

export async function findStockPhotoForCategory(category: string): Promise<StockPhoto | null> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey || !category.trim()) return null;

  try {
    const response = await fetch(
      `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(queryForCategory(category))}&per_page=3&orientation=landscape`,
      {
        headers: { Authorization: apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return null;

    const payload = await response.json() as { photos?: unknown };
    if (!Array.isArray(payload.photos)) return null;
    return payload.photos.map(stockPhotoFrom).find((photo): photo is StockPhoto => photo !== null) ?? null;
  } catch {
    // Estoque é opcional: limite, rede ou resposta inválida nunca bloqueiam geração.
    return null;
  }
}

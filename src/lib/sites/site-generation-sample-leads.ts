import type { LeadSiteInput } from "./build-generation-prompt";

export type SiteGenerationSample = {
  slug: string;
  nicheLabel: string;
  lead: LeadSiteInput;
};

/** Leads fictícios para amostras de geração (nunca usar leads reais). */
export const SITE_GENERATION_SAMPLES: SiteGenerationSample[] = [
  {
    slug: "petshop-dados-demonstrativos",
    nicheLabel: "petshop",
    lead: {
      companyName: "Petshop Amigo — Dados demonstrativos",
      category: "petshop",
      phone: "(11) 91234-5678",
      address: "Rua das Palmeiras, 45, Campinas, SP",
      instagram: "https://instagram.com/petshop_amigo_demo",
      websiteUrl: null,
      googleMapsUrl: "https://maps.google.com/?q=Petshop+Amigo+Campinas",
      photoUrls: ["https://images.example.com/demo/petshop-fachada.jpg"],
      stockPhoto: null,
      rating: 4.7,
      reviewCount: 86,
    },
  },
  {
    slug: "odontologia-dados-demonstrativos",
    nicheLabel: "odontologia",
    lead: {
      companyName: "Clínica Sorriso Norte — Dados demonstrativos",
      category: "consultório odontológico",
      phone: "(19) 99876-5432",
      address: "Av. Brasil, 900, Piracicaba, SP",
      instagram: null,
      websiteUrl: "https://example.com/clinica-sorriso-demo",
      googleMapsUrl: null,
      photoUrls: [],
      stockPhoto: null,
      rating: null,
      reviewCount: null,
    },
  },
  {
    slug: "salao-dados-demonstrativos",
    nicheLabel: "salão de beleza",
    lead: {
      companyName: "Studio Bella Cor — Dados demonstrativos",
      category: "salão de beleza",
      phone: "(21) 98765-4321",
      address: null,
      instagram: "https://instagram.com/studio_bella_demo",
      websiteUrl: null,
      googleMapsUrl: null,
      photoUrls: [],
      stockPhoto: null,
      rating: 4.9,
      reviewCount: 214,
    },
  },
  {
    slug: "oficina-dados-demonstrativos",
    nicheLabel: "oficina mecânica",
    lead: {
      companyName: "Oficina Rota Certa — Dados demonstrativos",
      category: "oficina mecânica",
      phone: "(31) 3344-5566",
      address: "Rua do Motor, 12, Belo Horizonte, MG",
      instagram: null,
      websiteUrl: null,
      googleMapsUrl: "https://maps.google.com/?q=Oficina+Rota+Certa",
      photoUrls: ["https://images.example.com/demo/oficina-box.jpg"],
      stockPhoto: null,
      rating: 4.5,
      reviewCount: 52,
    },
  },
  {
    slug: "advocacia-dados-demonstrativos",
    nicheLabel: "advocacia",
    lead: {
      companyName: "Advocacia Horizonte — Dados demonstrativos",
      category: "advocacia",
      phone: null,
      address: "Rua dos Advogados, 100, Curitiba, PR",
      instagram: null,
      websiteUrl: "https://example.com/advocacia-horizonte-demo",
      googleMapsUrl: null,
      photoUrls: [],
      stockPhoto: null,
      rating: null,
      reviewCount: null,
    },
  },
];

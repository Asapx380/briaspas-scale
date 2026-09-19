export type DemoGalleryItem = {
  slug: string;
  niche: string;
  city: string;
  businessName: string;
  href: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  imageAlt: string;
};

export const DEMO_GALLERY_ITEMS: DemoGalleryItem[] = [
  {
    slug: "patitas-pet",
    niche: "Petshop",
    city: "Vitória, ES",
    businessName: "Patitas Pet Shop",
    href: "/demonstracao/site-demo/patitas-pet",
    imageSrc: "/marketing/demo-gallery/patitas-pet.jpg",
    imageWidth: 1280,
    imageHeight: 800,
    imageAlt:
      "Prévia fictícia de site para petshop: hero com banner verde, serviços de banho e tosa e bloco de contato.",
  },
  {
    slug: "forca-ativa",
    niche: "Academia",
    city: "Joinville, SC",
    businessName: "Força Ativa Fitness",
    href: "/demonstracao/site-demo/forca-ativa",
    imageSrc: "/marketing/demo-gallery/forca-ativa.jpg",
    imageWidth: 1280,
    imageHeight: 800,
    imageAlt:
      "Prévia fictícia de site para academia: destaque de planos, grade de modalidades e chamada para aula experimental.",
  },
  {
    slug: "norte-contabil",
    niche: "Contabilidade",
    city: "Florianópolis, SC",
    businessName: "Norte Contábil Assessoria",
    href: "/demonstracao/site-demo/norte-contabil",
    imageSrc: "/marketing/demo-gallery/norte-contabil.jpg",
    imageWidth: 1280,
    imageHeight: 800,
    imageAlt:
      "Prévia fictícia de site para escritório contábil: serviços para MEI e PME, números demonstrativos e formulário de contato.",
  },
];

export const DEMO_SITE_SLUGS = DEMO_GALLERY_ITEMS.map((item) => item.slug);

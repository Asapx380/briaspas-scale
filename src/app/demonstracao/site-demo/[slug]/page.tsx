import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoSiteShell } from "@/components/marketing/demo-sites/demo-site-shell";
import { ForcaAtivaDemo } from "@/components/marketing/demo-sites/forca-ativa-demo";
import { NorteContabilDemo } from "@/components/marketing/demo-sites/norte-contabil-demo";
import { PatitasPetDemo } from "@/components/marketing/demo-sites/patitas-pet-demo";
import { DEMO_GALLERY_ITEMS, DEMO_SITE_SLUGS } from "@/lib/marketing/demo-gallery";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const PREVIEWS = {
  "patitas-pet": {
    title: "Patitas Pet Shop — site demonstrativo",
    Component: PatitasPetDemo,
  },
  "forca-ativa": {
    title: "Força Ativa Fitness — site demonstrativo",
    Component: ForcaAtivaDemo,
  },
  "norte-contabil": {
    title: "Norte Contábil — site demonstrativo",
    Component: NorteContabilDemo,
  },
} as const;

export function generateStaticParams() {
  return DEMO_SITE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = DEMO_GALLERY_ITEMS.find((entry) => entry.slug === slug);
  if (!item) {
    return { title: "Site demonstrativo" };
  }
  return {
    title: `${item.businessName} (demonstração)`,
    description: `Prévia fictícia de site para ${item.niche} em ${item.city}. Dados demonstrativos.`,
    robots: { index: false, follow: false },
  };
}

export default async function DemoSitePreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const preview = PREVIEWS[slug as keyof typeof PREVIEWS];
  if (!preview) {
    notFound();
  }
  const { Component, title } = preview;

  return (
    <main className="min-h-screen bg-[var(--neu-bg)]">
      <DemoSiteShell title={title}>
        <Component />
      </DemoSiteShell>
    </main>
  );
}

import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CRM_DEMO_LEADS } from "@/lib/crm/fixtures";
import { ScrollMotion } from "@/components/ui/scroll-motion";

const CrmBoard = nextDynamic(
  () => import("@/components/crm/crm-board").then((mod) => mod.CrmBoard),
);

export const metadata: Metadata = {
  title: "Demonstração do CRM",
  description:
    "Explore o funil de prospecção com dados fictícios: etapas, score e ações rápidas por lead.",
  alternates: {
    canonical: "/demonstracao",
  },
  openGraph: {
    title: "Demonstração do CRM | Briaspas Scale",
    description:
      "Veja como oportunidades fictícias são organizadas no CRM demonstrativo da Briaspas Scale.",
    url: "/demonstracao",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Demonstração do CRM | Briaspas Scale",
    description: "Funil demonstrativo com leads fictícios para conhecer o fluxo do produto.",
  },
};

export default function DemonstrationPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--neu-bg)] text-[var(--text)]">
      <ScrollMotion />
      <header className="border-b border-black/[0.06] bg-white/80 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3"><Image src="/brand/briaspas-scale-symbol.png?v=2" alt="" width={32} height={32} className="size-8" /><span className="font-semibold">Briaspas Scale</span></Link>
          <div className="flex items-center gap-3"><Link href="/" className="marketing-ghost-cta marketing-touch-target inline-flex gap-2 rounded-full px-4 py-2 text-sm font-semibold"><ArrowLeft size={16} weight="bold" aria-hidden /> Voltar</Link><Link href="/cadastro" className="marketing-button marketing-button-primary marketing-touch-target inline-flex gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">Criar conta <ArrowRight size={16} weight="bold" className="marketing-arrow" aria-hidden /></Link></div>
        </div>
      </header>
      <section data-reveal className="mx-auto max-w-7xl px-5 pt-9 sm:px-8"><p className="marketing-eyebrow text-sm font-semibold">Ambiente demonstrativo</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Veja como as oportunidades são organizadas.</h1><p className="mt-3 max-w-2xl leading-7 text-[var(--text-3)]">Os dados abaixo são fictícios e servem apenas para apresentar o fluxo do produto.</p></section>
      <div data-reveal className="reveal-delay-2 pb-12"><CrmBoard initialLeads={CRM_DEMO_LEADS} loadError={null} demoMode /></div>
    </main>
  );
}

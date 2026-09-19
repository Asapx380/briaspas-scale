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
  description: "Explore uma demonstração do CRM de prospecção da Briaspas Scale.",
};

export default function DemonstrationPage() {
  return (
    <main className="min-h-screen bg-[var(--neu-bg)] text-[var(--text)]">
      <ScrollMotion />
      <header className="border-b border-black/[0.06] bg-white/80 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3"><Image src="/brand/briaspas-scale-symbol.png?v=2" alt="" width={32} height={32} className="size-8" /><span className="font-semibold">Briaspas Scale</span></Link>
          <div className="flex items-center gap-3"><Link href="/" className="marketing-ghost-cta inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"><ArrowLeft size={16} weight="bold" /> Voltar</Link><Link href="/cadastro" className="marketing-button marketing-button-primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold">Criar conta <ArrowRight size={16} weight="bold" className="marketing-arrow" /></Link></div>
        </div>
      </header>
      <section data-reveal className="mx-auto max-w-7xl px-5 pt-9 sm:px-8"><p className="text-sm font-semibold text-[var(--brand)]">Ambiente demonstrativo</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Veja como as oportunidades são organizadas.</h1><p className="mt-3 max-w-2xl leading-7 text-[var(--text-3)]">Os dados abaixo são fictícios e servem apenas para apresentar o fluxo do produto.</p></section>
      <div data-reveal className="reveal-delay-2 pb-12"><CrmBoard initialLeads={CRM_DEMO_LEADS} loadError={null} demoMode /></div>
    </main>
  );
}

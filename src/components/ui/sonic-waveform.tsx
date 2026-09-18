"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "@phosphor-icons/react";
import { TrendChart } from "@/components/app/dashboard-widgets";

const previewPoints = [
  { key: "1", label: "1", created: 3, won: 0 },
  { key: "2", label: "5", created: 5, won: 1 },
  { key: "3", label: "10", created: 4, won: 1 },
  { key: "4", label: "15", created: 8, won: 2 },
  { key: "5", label: "20", created: 6, won: 2 },
  { key: "6", label: "25", created: 10, won: 3 },
  { key: "7", label: "30", created: 9, won: 4 },
];

export default function SonicWaveformHero() {
  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[#f4f7fb] text-[var(--text)]">
      <div className="landing-ambient pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(0,113,227,0.14),transparent_34%)]" />
      <header className="landing-enter relative z-20 mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--brand)]" aria-label="Briaspas Scale">
          <Image src="/brand/briaspas-scale-symbol.png?v=2" alt="" width={256} height={256} priority className="size-10" />
          <span className="text-sm font-semibold tracking-tight">Briaspas Scale</span>
        </Link>
        <nav aria-label="Navegação da página" className="hidden items-center gap-7 text-sm font-medium text-[var(--text-3)] md:flex">
          <Link href="#como-funciona" className="hover:text-[var(--text)]">Como funciona</Link>
          <Link href="#recursos" className="hover:text-[var(--text)]">Recursos</Link>
          <Link href="#seguranca" className="hover:text-[var(--text)]">Segurança</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] sm:px-4">Entrar</Link>
          <Link href="/cadastro" className="whitespace-nowrap rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,113,227,0.22)] hover:bg-[var(--brand-hover)]">Começar grátis</Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:py-16">
        <div className="max-w-xl">
          <p className="landing-enter motion-delay-1 text-sm font-semibold text-[var(--brand)]">Prospecção para freelancers e agências</p>
          <h1 className="landing-enter motion-delay-2 mt-5 text-4xl leading-[1.03] font-bold tracking-[-0.05em] text-balance sm:text-5xl lg:text-6xl">Chegue ao lead com uma proposta concreta.</h1>
          <p className="landing-enter motion-delay-3 mt-6 max-w-lg text-base leading-7 text-[var(--text-3)] sm:text-lg">Encontre negócios locais, apresente um site personalizado e acompanhe cada oportunidade até o fechamento.</p>
          <div className="landing-enter motion-delay-4 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className="marketing-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--brand)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(0,113,227,0.24)] hover:bg-[var(--brand-hover)]"><span>Começar grátis</span><ArrowRight size={18} weight="bold" className="marketing-arrow" /></Link>
            <Link href="/demonstracao" className="marketing-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-black/10 bg-white px-6 py-3.5 text-sm font-semibold text-[var(--text)] shadow-sm hover:border-black/15"><PlayCircle size={19} weight="fill" className="text-[var(--brand)]" /><span>Ver demonstração</span></Link>
          </div>
        </div>

        <div className="landing-preview-enter motion-delay-5 relative rounded-[28px] border border-white/80 bg-white/55 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.13)] backdrop-blur-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between px-2 text-xs font-medium text-[var(--text-4)]"><span>Visão geral</span><span>Dados demonstrativos</span></div>
          <div className="pointer-events-none overflow-hidden rounded-[22px] bg-[var(--neu-bg)]"><TrendChart points={previewPoints} period="30d" /></div>
        </div>
      </div>
    </section>
  );
}

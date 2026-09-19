"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "@phosphor-icons/react";
import { HeroMock } from "@/components/marketing/hero-mock";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function SonicWaveformHero() {
  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[var(--marketing-hero-bg)] text-[var(--text)]">
      <div className="landing-ambient pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(0,113,227,0.14),transparent_34%)]" />
      {/* Header stays fully opaque — landing-enter opacity must not wrap CTAs. */}
      <header className="relative z-20 mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-2 px-5 sm:gap-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--brand)]" aria-label="Briaspas Scale">
          <Image src="/brand/briaspas-scale-symbol.png?v=2" alt="" width={40} height={40} priority sizes="40px" className="size-10" />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">Briaspas Scale</span>
        </Link>
        <nav aria-label="Navegação da página" className="hidden items-center gap-5 whitespace-nowrap text-sm font-medium lg:flex lg:gap-7">
          <Link href="#como-funciona" className="marketing-nav-link marketing-touch-target inline-flex px-2">Como funciona</Link>
          <Link href="#recursos" className="marketing-nav-link marketing-touch-target inline-flex px-2">Recursos</Link>
          <Link href="#seguranca" className="marketing-nav-link marketing-touch-target inline-flex px-2">Segurança</Link>
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="marketing-ghost-cta marketing-touch-target inline-flex rounded-full px-3 text-sm font-medium sm:px-4"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="marketing-button marketing-button-primary marketing-touch-target inline-flex whitespace-nowrap rounded-full px-4 text-sm font-semibold shadow-[0_8px_24px_rgba(0,113,227,0.22)]"
          >
            Começar grátis
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:py-16">
        <div className="max-w-xl">
          <p className="landing-enter motion-delay-1 marketing-eyebrow text-sm font-semibold">Prospecção para freelancers e agências</p>
          <h1 className="landing-enter motion-delay-2 mt-5 text-4xl leading-[1.03] font-bold tracking-[-0.05em] text-balance sm:text-5xl lg:text-6xl">Chegue ao lead com uma proposta concreta.</h1>
          <p className="landing-enter motion-delay-3 mt-6 max-w-lg text-base leading-7 text-[var(--text-3)] sm:text-lg">Encontre negócios locais, apresente um site personalizado e acompanhe cada oportunidade até o fechamento.</p>
          <div className="landing-enter motion-delay-4 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cadastro"
              className="marketing-button marketing-button-primary marketing-touch-target inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3.5 text-sm font-semibold shadow-[0_10px_28px_rgba(0,113,227,0.24)]"
            >
              <span>Começar grátis</span>
              <ArrowRight size={18} weight="bold" className="marketing-arrow" />
            </Link>
            <Link
              href="/demonstracao"
              className="marketing-button marketing-button-secondary marketing-touch-target inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3.5 text-sm font-semibold shadow-sm"
            >
              <PlayCircle size={19} weight="fill" className="text-[var(--brand)]" />
              <span>Ver demonstração</span>
            </Link>
          </div>
        </div>

        <div className="landing-preview-enter motion-delay-5 relative min-w-0 w-full rounded-[28px] border border-[var(--border)] bg-[var(--hero-panel-bg)] p-3 shadow-[0_28px_80px_rgba(15,23,42,0.13)] backdrop-blur-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2 px-2 text-xs font-medium text-[var(--text-3)]">
            <span className="truncate">Site-demo + lead</span>
            <span className="shrink-0">Dados demonstrativos</span>
          </div>
          <div className="pointer-events-none min-w-0 overflow-hidden">
            <HeroMock />
          </div>
        </div>
      </div>
    </section>
  );
}

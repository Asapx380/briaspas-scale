"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChartLineUp } from "@phosphor-icons/react";

/**
 * Soft aurora / gradient-glow hero ambience.
 * Visual idea adapted from 21st.dev "Background Gradient Glow" (meghtrix) —
 * soft radial washes that slowly drift — recolored to Briaspas `#0071E3`
 * for a premium B2B look (no neon, no particle overload).
 */
function SoftGradientGlowBackground() {
  return (
    <div className="hero-glow pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#f4f7fb]" />

      {/* Soft brand mesh — static base */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 55% at 55% 18%, rgba(0, 113, 227, 0.28), transparent 62%),
            radial-gradient(ellipse 55% 45% at 12% 78%, rgba(0, 122, 255, 0.18), transparent 60%),
            radial-gradient(ellipse 50% 40% at 88% 62%, rgba(90, 140, 220, 0.16), transparent 58%),
            linear-gradient(180deg, #eef4fb 0%, #e6ebf2 55%, #e2e5ec 100%)
          `,
        }}
      />

      {/* Gentle floating orbs — very low motion */}
      <div className="hero-glow-orb hero-glow-orb-a" />
      <div className="hero-glow-orb hero-glow-orb-b" />
      <div className="hero-glow-orb hero-glow-orb-c" />

      {/* Faint refined grid (barely visible) */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 113, 227, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 113, 227, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      {/* Readability veil under copy */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(244,247,251,0.15)_0%,rgba(244,247,251,0.35)_45%,rgba(230,231,236,0.88)_100%)]" />
    </div>
  );
}

export default function SonicWaveformHero() {
  return (
    <section className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-5 py-24 text-[var(--text)] sm:px-8">
      <SoftGradientGlowBackground />

      <header className="absolute top-0 left-1/2 z-20 flex h-20 w-full max-w-7xl -translate-x-1/2 items-center justify-between gap-5 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Briaspas Scale">
          <Image
            src="/brand/briaspas-scale-symbol.png"
            alt=""
            width={256}
            height={256}
            priority
            className="size-10"
          />
          <span className="text-sm font-semibold tracking-tight">Briaspas Scale</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(0,113,227,0.3)] transition-opacity hover:opacity-90"
          >
            Começar grátis
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-4 py-1.5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-sm">
          <ChartLineUp size={17} weight="bold" className="text-[var(--brand)]" />
          <span className="text-sm font-medium text-[var(--text-2)]">Prospecção inteligente</span>
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl leading-[1.05] font-bold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
          Transforme empresas da sua região em novos projetos.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[var(--text-3)] sm:text-lg">
          Encontre empresas reais, apresente sites personalizados e priorize quem
          demonstrou interesse — em minutos.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(0,113,227,0.32)] transition-opacity hover:opacity-90"
          >
            Começar grátis
            <ArrowRight size={18} weight="bold" />
          </Link>
          <Link
            href="#recursos"
            className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-6 py-3.5 text-sm font-semibold text-[var(--text)] shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-opacity hover:opacity-90"
          >
            Ver como funciona
          </Link>
        </div>
      </div>
    </section>
  );
}

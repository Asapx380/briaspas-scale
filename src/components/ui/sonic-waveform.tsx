"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChartLineUp } from "@phosphor-icons/react";
import KineticGrid from "@/components/ui/kinetic-grid";

export default function SonicWaveformHero() {
  return (
    <section className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-5 py-24 text-[var(--text)] sm:px-8">
      <KineticGrid className="pointer-events-none absolute inset-0" />
      {/* Soft veil so hero copy stays readable over the interactive grid */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(238,242,247,0.2)_0%,rgba(238,242,247,0.45)_48%,rgba(230,231,236,0.9)_100%)]"
        aria-hidden
      />

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

"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import KineticGrid from "@/components/ui/kinetic-grid";

export default function LandingHero() {
  return (
    <section className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-5 py-24 text-[var(--text)] sm:px-8">
      {/* Background only — fills the viewport behind the copy */}
      <KineticGrid />
      {/* Soft center veil so text stays readable without hiding the grid */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(238,242,247,0.72)_0%,rgba(238,242,247,0.25)_55%,transparent_80%)]"
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
          <span className="text-base font-semibold tracking-tight sm:text-lg">Briaspas Scale</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text)]"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--brand)]">Briaspas Scale</p>

        <h1 className="mt-4 max-w-3xl text-4xl leading-[1.08] font-bold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">
          Prospecção local com site demo e CRM no mesmo fluxo.
        </h1>

        <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-3)] sm:text-lg">
          Importe empresas reais, publique uma página por lead e priorize quem
          visitou a apresentação.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Criar conta
            <ArrowRight size={18} weight="bold" />
          </Link>
          <Link
            href="#recursos"
            className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-white/85 px-6 py-3.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-white"
          >
            Ver o fluxo
          </Link>
        </div>
      </div>
    </section>
  );
}

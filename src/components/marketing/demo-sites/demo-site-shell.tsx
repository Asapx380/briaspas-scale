import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

type DemoSiteShellProps = {
  title: string;
  children: ReactNode;
};

export function DemoSiteShell({ title, children }: DemoSiteShellProps) {
  return (
    <div className="demo-site-root min-h-screen bg-[var(--preview-canvas-bg,var(--neu-bg))] text-[var(--text)]">
      <div className="border-b border-[var(--border)] bg-[var(--header-bg,var(--card))] backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Site demonstrativo — dados fictícios
          </p>
          <Link
            href="/#sites-demo"
            className="marketing-ghost-cta inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} weight="bold" aria-hidden />
            Voltar à galeria
          </Link>
        </div>
      </div>
      <div className="sr-only">
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}

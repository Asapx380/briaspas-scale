import Link from "next/link";

export default function CriarSitePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-sm font-medium text-[var(--brand)]">Sites</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Criar site</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-3)] sm:text-base">
        O assistente de criação com leads, descrição livre e modelos chega na próxima entrega.
      </p>
      <div className="app-card mt-10 p-8 text-center sm:p-12">
        <p className="text-lg font-semibold text-[var(--text)]">Em breve</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-3)]">
          Enquanto isso, gere o briefing e envie o site em ZIP pelo detalhe do lead no CRM.
        </p>
        <Link
          href="/app/sites"
          className="mt-6 inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          Ir para Meus sites
        </Link>
      </div>
    </main>
  );
}

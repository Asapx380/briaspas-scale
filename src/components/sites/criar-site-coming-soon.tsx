import Link from "next/link";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

type CriarSiteComingSoonProps = {
  sitesHref?: string;
};

export function CriarSiteComingSoon({ sitesHref = "/app/sites" }: CriarSiteComingSoonProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-sm font-medium text-[var(--brand)]">Criar site</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Em breve</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-3)] sm:text-base">
        A geração automática de HTML ainda não está disponível no Briaspas Scale.
      </p>
      <div className="app-card mt-10 p-8 text-center sm:p-12">
        <p className="mx-auto max-w-md text-sm leading-6 text-[var(--text-3)]">
          Use o briefing e o envio de ZIP no detalhe do lead no CRM. O site aparece depois em Meus
          sites.
        </p>
        <Link
          href={sitesHref}
          className={`mt-6 inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] ${FOCUS}`}
        >
          Ir para Meus sites
        </Link>
      </div>
    </main>
  );
}

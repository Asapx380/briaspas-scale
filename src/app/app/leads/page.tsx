import { LeadIntake } from "@/components/leads/lead-intake";
import { LeadSearch } from "@/components/leads/lead-search";

export default function LeadsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-[var(--brand)]">Prospecção</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Adicione empresas ao seu CRM
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-3)] sm:text-base">
          Pesquise por nicho e cidade, confira os resultados e envie todos ao CRM
          com um clique. CSV e cadastro manual continuam disponíveis como apoio.
        </p>
      </div>

      <LeadSearch />

      <div className="mt-14 border-t border-black/5 pt-10">
        <p className="text-sm font-medium text-[var(--text-4)]">Outras formas de entrada</p>
        <LeadIntake />
      </div>
    </main>
  );
}

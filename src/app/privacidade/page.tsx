import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { ScrollMotion } from "@/components/ui/scroll-motion";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--neu-bg)] px-5 py-12 text-[var(--text)] sm:px-8 sm:py-16">
      <ScrollMotion />
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="landing-enter marketing-link marketing-eyebrow inline-flex items-center gap-2 text-sm font-semibold">
          <ArrowLeft size={16} weight="bold" className="marketing-arrow" /> Voltar
        </Link>

        <header data-reveal className="mt-10 border-b border-black/[0.07] pb-10">
          <ShieldCheck size={42} weight="duotone" className="text-[var(--brand)]" />
          <h1 className="mt-6 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Privacidade e dados</h1>
          <p className="mt-5 max-w-2xl leading-7 text-[var(--text-3)]">
            A Briaspas Scale organiza dados profissionais públicos de empresas para prospecção comercial. Não vendemos dados pessoais e limitamos a coleta ao necessário para identificar e contatar negócios.
          </p>
        </header>

        <section data-reveal className="mt-10 rounded-[24px] bg-white p-7 shadow-[var(--shadow-card)] sm:p-9">
          <h2 className="text-xl font-semibold">Seus direitos</h2>
          <p className="mt-3 leading-7 text-[var(--text-3)]">
            O titular pode solicitar confirmação, acesso, correção, oposição ou exclusão. O operador da conta deve registrar a solicitação e excluir o lead pelo CRM, o que também remove sites, projetos vinculados e registros dependentes conforme a política do banco.
          </p>
        </section>

        <section data-reveal className="reveal-delay-1 mt-5 rounded-[24px] bg-white p-7 shadow-[var(--shadow-card)] sm:p-9">
          <h2 className="text-xl font-semibold">Retenção e segurança</h2>
          <p className="mt-3 leading-7 text-[var(--text-3)]">
            Leads sem atividade devem ser revisados periodicamente. Credenciais ficam no servidor, tokens Google são criptografados e o acesso aos dados é separado por workspace.
          </p>
        </section>

        <p data-reveal className="mt-8 text-sm leading-6 text-[var(--text-4)]">
          Este texto é uma base operacional e deve ser revisado por assessoria jurídica antes do lançamento comercial.
        </p>
      </article>
    </main>
  );
}

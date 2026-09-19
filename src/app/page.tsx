import Link from "next/link";
import nextDynamic from "next/dynamic";
import type { Metadata } from "next";
import {
  ArrowRight,
  CheckCircle,
  Globe,
  Kanban,
  LockKey,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { JourneySection } from "@/components/marketing/journey-section";
import SonicWaveformHero from "@/components/ui/sonic-waveform";
import { ScrollMotion } from "@/components/ui/scroll-motion";

const MiniDemo = nextDynamic(() => import("@/components/marketing/mini-demo"));

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Briaspas Scale | Prospecção com sites-demo e CRM",
    description: "Da busca de empresas ao fechamento, sem perder o contexto comercial.",
    url: "/",
    siteName: "Briaspas Scale",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Briaspas Scale | Prospecção com sites-demo e CRM",
    description: "Encontre empresas, apresente sites personalizados e avance no CRM.",
  },
};

const capabilities = [
  { text: "Busca e importação de empresas" },
  { text: "CRM visual com follow-ups" },
  { text: "Publicação de site-demo em link exclusivo por lead" },
  { text: "Registro de visitas ao link" },
  { text: "Projetos e tarefas pós-venda", badge: "Em evolução" },
  { text: "Agenda e organização da equipe", badge: "Em breve" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--neu-bg)] text-[var(--text)]">
      <ScrollMotion />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[var(--card)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg">Ir para o conteúdo</a>
      <SonicWaveformHero />

      <JourneySection />

      <MiniDemo />

      <section id="recursos" className="marketing-section-ink">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:py-32">
          <div data-reveal>
            <Kanban size={38} weight="duotone" className="text-[var(--brand)]" />
            <h2 className="mt-7 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">O contexto comercial permanece no mesmo lugar.</h2>
            <p className="mt-5 max-w-md leading-7 text-[var(--on-ink-muted)]">Chega de separar planilha, gerador de site, agenda e anotações do cliente.</p>
          </div>
          <div className="grid content-start gap-x-10 gap-y-8 sm:grid-cols-2">
            {capabilities.map((item, index) => (
              <div key={item.text} data-reveal className={`flex items-start gap-3 reveal-delay-${Math.min(index, 5)}`}>
                <CheckCircle size={21} weight="fill" className="mt-0.5 shrink-0 text-[var(--brand-on-ink)]" />
                <p className="font-semibold text-[var(--on-ink)]">
                  {item.text}
                  {item.badge ? (
                    <span className="ml-2 inline-flex rounded-full bg-[var(--ink-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--on-ink-muted)]">
                      {item.badge}
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
            <Link href="/demonstracao" data-reveal className="marketing-link reveal-delay-3 mt-2 inline-flex items-center gap-2 font-semibold text-[var(--brand-on-ink)] hover:text-[var(--brand-on-ink)] sm:col-span-2">
              Explorar o CRM demonstrativo <ArrowRight size={17} weight="bold" className="marketing-arrow" />
            </Link>
          </div>
        </div>
      </section>

      <section id="seguranca" className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:py-32">
        <div data-reveal><ShieldCheck size={40} weight="duotone" className="text-[var(--brand)]" /><h2 className="mt-7 max-w-2xl text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Seus dados comerciais não viram parte da demonstração.</h2><p className="mt-5 max-w-2xl leading-7 text-[var(--text-3)]">Login obrigatório para a área logada, dados separados por workspace e regras de acesso no banco (RLS) no Supabase.</p></div>
        <div data-reveal className="reveal-delay-2 self-end rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-7 shadow-[var(--shadow-card)]">
          <div className="flex gap-3"><LockKey size={23} className="mt-0.5 shrink-0 text-[var(--brand)]" /><div><h3 className="font-semibold">Segredos ficam no servidor</h3><p className="mt-2 text-sm leading-6 text-[var(--text-3)]">Chaves de IA e outras credenciais de provedor ficam em variáveis de ambiente do servidor, não no bundle do navegador.</p></div></div>
          <div className="mt-6 flex gap-3 border-t border-[var(--border)] pt-6"><Globe size={23} className="mt-0.5 shrink-0 text-[var(--brand)]" /><div><h3 className="font-semibold">Links de site com escopo limitado</h3><p className="mt-2 text-sm leading-6 text-[var(--text-3)]">A prévia antes de publicar é privada e temporária. Só o site publicado fica acessível no link enviado ao lead.</p></div></div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--marketing-soft-bg)] px-5 py-20 sm:px-8">
        <div data-reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div><p className="marketing-eyebrow text-sm font-semibold">MVP em validação</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Use gratuitamente durante esta fase.</h2><p className="mt-3 max-w-2xl leading-7 text-[var(--text-3)]">Nesta fase gratuita você pode testar busca, importação, CRM e sites-demo. Agenda e projetos ainda estão em desenvolvimento.</p></div>
          <Link href="/cadastro" className="marketing-button marketing-button-primary marketing-touch-target inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-6 py-3.5 text-sm font-semibold shadow-[0_10px_28px_rgba(0,113,227,0.24)]">Começar grátis <ArrowRight size={18} weight="bold" className="marketing-arrow" aria-hidden /></Link>
        </div>
      </section>

      <footer className="bg-[var(--card)] px-5 py-10 sm:px-8"><div data-reveal className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Globe size={22} weight="duotone" className="text-[var(--brand)]" /><div><p className="font-semibold">Briaspas Scale</p><p className="mt-1 text-sm text-[var(--text-3)]">Prospecção e entrega em um só fluxo.</p></div></div><nav aria-label="Links institucionais" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium"><Link href="/demonstracao" className="marketing-nav-link">Demonstração</Link><Link href="/privacidade" className="marketing-nav-link">Privacidade</Link><Link href="https://github.com/Asapx380/briaspas-scale" className="marketing-nav-link">GitHub</Link><Link href="/login" className="marketing-nav-link">Entrar</Link></nav></div></footer>
    </main>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  ChartLineUp,
  CheckCircle,
  Factory,
  Globe,
  Kanban,
  LockKey,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import SonicWaveformHero from "@/components/ui/sonic-waveform";
import { ScrollMotion } from "@/components/ui/scroll-motion";

const journey = [
  { icon: Factory, title: "Encontre", text: "Busque empresas por nicho e cidade ou importe sua própria lista." },
  { icon: Sparkle, title: "Apresente", text: "Crie um site-demo personalizado com os dados reais de cada negócio." },
  { icon: ChartLineUp, title: "Priorize", text: "Veja visitas, organize retornos e concentre energia nos leads mais quentes." },
];

const capabilities = [
  "Busca e importação de empresas",
  "CRM visual com follow-ups",
  "Site-demo responsivo por lead",
  "Registro de visitas ao link",
  "Projetos e tarefas pós-venda",
  "Agenda e organização da equipe",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--neu-bg)] text-[var(--text)]">
      <ScrollMotion />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg">Ir para o conteúdo</a>
      <SonicWaveformHero />

      <section id="como-funciona" className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div id="conteudo" className="max-w-2xl scroll-mt-24" data-reveal>
          <h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Do primeiro contato ao projeto fechado.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-3)]">Um processo curto, rastreável e feito para quem vende sites para negócios locais.</p>
        </div>
        <div className="mt-14 overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-card)]" data-reveal="clip">
          {journey.map(({ icon: Icon, title, text }) => (
            <article key={title} className="journey-row grid gap-5 border-b border-black/[0.07] p-6 last:border-0 sm:grid-cols-[3rem_1fr] sm:p-8 lg:grid-cols-[3rem_0.4fr_1fr] lg:items-center">
              <div className="journey-icon grid size-12 place-items-center rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand)]"><Icon size={23} weight="duotone" /></div>
              <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
              <p className="max-w-2xl leading-7 text-[var(--text-3)]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="recursos" className="bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:py-32">
          <div data-reveal><Kanban size={38} weight="duotone" className="text-[var(--brand)]" /><h2 className="mt-7 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">O contexto comercial permanece no mesmo lugar.</h2><p className="mt-5 max-w-md leading-7 text-[var(--text-3)]">Chega de separar planilha, gerador de site, agenda e anotações do cliente.</p></div>
          <div className="grid content-start gap-x-10 gap-y-8 sm:grid-cols-2">
            {capabilities.map((item, index) => <div key={item} data-reveal className={`flex items-start gap-3 reveal-delay-${Math.min(index, 5)}`}><CheckCircle size={21} weight="fill" className="mt-0.5 shrink-0 text-[var(--brand)]" /><p className="font-semibold text-[var(--text-2)]">{item}</p></div>)}
            <Link href="/demonstracao" data-reveal className="marketing-link reveal-delay-3 mt-2 inline-flex items-center gap-2 font-semibold text-[var(--brand)] hover:text-[var(--brand-hover)] sm:col-span-2">Explorar o CRM demonstrativo <ArrowRight size={17} weight="bold" className="marketing-arrow" /></Link>
          </div>
        </div>
      </section>

      <section id="seguranca" className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:py-32">
        <div data-reveal><ShieldCheck size={40} weight="duotone" className="text-[var(--brand)]" /><h2 className="mt-7 max-w-2xl text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Seus dados comerciais não viram parte da demonstração.</h2><p className="mt-5 max-w-2xl leading-7 text-[var(--text-3)]">Acesso autenticado, isolamento por workspace e políticas de banco protegem leads, membros e projetos.</p></div>
        <div data-reveal className="reveal-delay-2 self-end rounded-[24px] border border-black/[0.06] bg-white p-7 shadow-[var(--shadow-card)]">
          <div className="flex gap-3"><LockKey size={23} className="mt-0.5 shrink-0 text-[var(--brand)]" /><div><h3 className="font-semibold">Segredos ficam no servidor</h3><p className="mt-2 text-sm leading-6 text-[var(--text-3)]">Chaves de IA, tokens e credenciais privadas não são enviados ao navegador.</p></div></div>
          <div className="mt-6 flex gap-3 border-t border-black/[0.07] pt-6"><Globe size={23} className="mt-0.5 shrink-0 text-[var(--brand)]" /><div><h3 className="font-semibold">Publicação controlada</h3><p className="mt-2 text-sm leading-6 text-[var(--text-3)]">Somente o conteúdo publicado aparece no link enviado ao potencial cliente.</p></div></div>
        </div>
      </section>

      <section className="border-y border-black/[0.06] bg-[#f4f7fb] px-5 py-20 sm:px-8">
        <div data-reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div><p className="text-sm font-semibold text-[var(--brand)]">MVP em validação</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Use gratuitamente durante esta fase.</h2><p className="mt-3 max-w-2xl leading-7 text-[var(--text-3)]">Alguns recursos ainda estão evoluindo. O fluxo de leads, sites-demo, CRM e projetos já pode ser usado.</p></div>
          <Link href="/cadastro" className="marketing-button inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--brand)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(0,113,227,0.24)] hover:bg-[var(--brand-hover)]">Começar grátis <ArrowRight size={18} weight="bold" className="marketing-arrow" /></Link>
        </div>
      </section>

      <footer className="bg-white px-5 py-10 sm:px-8"><div data-reveal className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Globe size={22} weight="duotone" className="text-[var(--brand)]" /><div><p className="font-semibold">Briaspas Scale</p><p className="mt-1 text-sm text-[var(--text-4)]">Prospecção e entrega em um só fluxo.</p></div></div><nav aria-label="Links institucionais" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[var(--text-3)]"><Link href="/demonstracao" className="hover:text-[var(--text)]">Demonstração</Link><Link href="/privacidade" className="hover:text-[var(--text)]">Privacidade</Link><Link href="https://github.com/Asapx380/briaspas-scale" className="hover:text-[var(--text)]">GitHub</Link><Link href="/login" className="hover:text-[var(--text)]">Entrar</Link></nav></div></footer>
    </main>
  );
}

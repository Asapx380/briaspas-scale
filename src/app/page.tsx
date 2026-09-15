import Link from "next/link";
import SonicWaveformHero from "@/components/ui/sonic-waveform";

const features = [
  {
    title: "Empresas reais",
    description: "Organize sua prospecção, importe empresas e acompanhe oportunidades em um só fluxo.",
  },
  {
    title: "Site por lead",
    description: "Gere uma apresentação personalizada para cada oportunidade em poucos cliques.",
  },
  {
    title: "Interesse visível",
    description: "Veja visitas recentes e escolha quem abordar primeiro.",
  },
];

const steps = [
  { title: "Busque", text: "Encontre empresas por nicho e cidade." },
  { title: "Apresente", text: "Envie um site sob medida para o lead." },
  { title: "Feche", text: "Priorize quem engajou e avance no CRM." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--neu-bg)] text-[var(--text)]">
      <SonicWaveformHero />

      <section id="recursos" className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Da busca ao fechamento, sem perder o contexto.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-3)]">
            O Briaspas Scale reúne prospecção, apresentação e acompanhamento
            comercial no mesmo lugar.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="app-card p-7">
              <p className="text-sm font-semibold text-[var(--brand)]">0{index + 1}</p>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-3)]">{step.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <article className="app-card p-8 md:row-span-2 md:p-10">
            <p className="text-sm font-semibold text-[var(--brand)]">{features[0].title}</p>
            <p className="mt-4 max-w-md text-2xl leading-tight font-semibold sm:text-3xl">
              {features[0].description}
            </p>
          </article>

          {features.slice(1).map((feature) => (
            <article key={feature.title} className="app-card p-8 md:p-10">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-[var(--text-3)]">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-[var(--brand)] px-8 py-10 text-white shadow-[0_16px_40px_rgba(0,113,227,0.28)]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pronto para prospectar?</h2>
            <p className="mt-2 text-sm text-white/80 sm:text-base">
              Crie sua conta e comece a organizar leads em minutos.
            </p>
          </div>
          <Link
            href="/cadastro"
            className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--brand)] transition-opacity hover:opacity-90"
          >
            Começar grátis
          </Link>
        </div>
      </section>
    </main>
  );
}

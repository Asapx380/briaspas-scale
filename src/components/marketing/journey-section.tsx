import { ChartLineUp, Factory, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { JourneyScrollSync } from "@/components/marketing/journey-scroll-sync";
import { journeyPanels } from "@/components/marketing/journey-panels";

const steps = [
  {
    id: "encontre",
    icon: Factory,
    title: "Encontre",
    text: "Busque empresas por nicho e cidade ou importe sua própria lista.",
  },
  {
    id: "apresente",
    icon: Sparkle,
    title: "Apresente",
    text: "Monte um site-demo com as informações do negócio que você encontrou ou cadastrou — sempre revisadas antes de enviar.",
  },
  {
    id: "priorize",
    icon: ChartLineUp,
    title: "Priorize",
    text: "Veja visitas, organize retornos e concentre energia nos leads mais quentes.",
  },
] as const;

export function JourneySection() {
  return (
    <section id="como-funciona" className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
      <div id="conteudo" className="max-w-2xl scroll-mt-24" data-reveal>
        <h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Do primeiro contato ao projeto fechado.</h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-3)]">
          Um processo curto, rastreável e feito para quem vende sites para negócios locais.
        </p>
      </div>

      <div
        className="journey-root mt-14"
        data-journey-root
        data-active-step="0"
        data-reveal="clip"
      >
        <JourneyScrollSync />
        <div className="journey-layout lg:grid lg:grid-cols-2 lg:gap-10 xl:gap-14">
          <ol className="journey-steps list-none space-y-12 p-0 m-0 lg:space-y-0" aria-label="Etapas do fluxo">
            {steps.map((step, index) => {
              const Panel = journeyPanels[index].Panel;
              const Icon = step.icon;
              return (
                <li key={step.id}>
                  <article
                    id={`journey-step-${step.id}`}
                    data-journey-step={index}
                    data-active={index === 0 ? "true" : "false"}
                    aria-labelledby={`journey-step-title-${step.id}`}
                    className="journey-step scroll-mt-28 lg:min-h-[70vh] lg:flex lg:flex-col lg:justify-center lg:py-10"
                  >
                    <div className="journey-step-copy max-w-xl">
                      <div className="journey-icon grid size-12 place-items-center rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand)]">
                        <Icon size={23} weight="duotone" aria-hidden="true" />
                      </div>
                      <h3
                        id={`journey-step-title-${step.id}`}
                        className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl"
                      >
                        {step.title}
                      </h3>
                      <p className="mt-3 text-base leading-7 text-[var(--text-3)]">{step.text}</p>
                    </div>
                    <div className="journey-step-inline-panel mt-8 lg:hidden" aria-hidden={false}>
                      <Panel />
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>

          <div
            className="journey-panels-col hidden lg:block"
            aria-label="Visualização demonstrativa das etapas"
            aria-live="polite"
          >
            <div className="journey-sticky-wrap sticky top-24">
              <div className="journey-sticky-inner">
                {journeyPanels.map((entry, index) => (
                  <div
                    key={entry.id}
                    data-journey-panel={index}
                    data-active={index === 0 ? "true" : "false"}
                    className="journey-panel-layer"
                    id={`journey-panel-${entry.id}`}
                    role="region"
                    aria-labelledby={`journey-step-title-${entry.id}`}
                  >
                    <entry.Panel />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

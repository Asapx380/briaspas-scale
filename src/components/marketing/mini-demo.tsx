"use client";

import Link from "next/link";
import { ArrowRight, MagnifyingGlass, Star } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useId, useState } from "react";

const NICHES = [
  { value: "dentista", label: "Dentista" },
  { value: "salao", label: "Salão de beleza" },
  { value: "petshop", label: "Petshop" },
  { value: "academia", label: "Academia" },
  { value: "restaurante", label: "Restaurante" },
] as const;

type NicheValue = (typeof NICHES)[number]["value"];

const DEMO_CITIES = [
  { value: "campinas", label: "Campinas", ddd: "19" },
  { value: "piracicaba", label: "Piracicaba", ddd: "19" },
  { value: "sao-paulo", label: "São Paulo", ddd: "11" },
  { value: "rio-de-janeiro", label: "Rio de Janeiro", ddd: "21" },
  { value: "belo-horizonte", label: "Belo Horizonte", ddd: "31" },
] as const;

type CityValue = (typeof DEMO_CITIES)[number]["value"];

type DemoLead = {
  name: string;
  rating: number;
  phone: string;
  tier: "quente" | "morno";
};

type LeadTemplate = {
  nameStem: string;
  rating: number;
  phoneTail: string;
  tier: DemoLead["tier"];
};

const LEAD_TEMPLATES: Record<NicheValue, LeadTemplate[]> = {
  dentista: [
    { nameStem: "Clínica Sorriso", rating: 4.7, phoneTail: "4820", tier: "quente" },
    { nameStem: "Odonto Viva", rating: 4.4, phoneTail: "1198", tier: "morno" },
    { nameStem: "Centro Odontológico", rating: 4.9, phoneTail: "6671", tier: "quente" },
  ],
  salao: [
    { nameStem: "Studio Bella Cabelo", rating: 4.8, phoneTail: "9033", tier: "quente" },
    { nameStem: "Espaço Charme Unhas", rating: 4.2, phoneTail: "4410", tier: "morno" },
    { nameStem: "Salão Dona Flor", rating: 4.5, phoneTail: "2287", tier: "morno" },
  ],
  petshop: [
    { nameStem: "Pet Amigo Center", rating: 4.6, phoneTail: "5520", tier: "quente" },
    { nameStem: "Banho & Tosa Patas Felizes", rating: 4.3, phoneTail: "9014", tier: "morno" },
    { nameStem: "Mundo Animal", rating: 4.1, phoneTail: "7782", tier: "morno" },
  ],
  academia: [
    { nameStem: "Iron Fit Academia", rating: 4.5, phoneTail: "6601", tier: "quente" },
    { nameStem: "Corpo em Movimento", rating: 4.0, phoneTail: "3318", tier: "morno" },
    { nameStem: "Studio Pilates & Funcional", rating: 4.7, phoneTail: "8845", tier: "quente" },
  ],
  restaurante: [
    { nameStem: "Sabor da Roça", rating: 4.8, phoneTail: "1144", tier: "quente" },
    { nameStem: "Cantina do Lago", rating: 4.2, phoneTail: "7720", tier: "morno" },
    { nameStem: "Bistrô Central", rating: 4.6, phoneTail: "5593", tier: "quente" },
  ],
};

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

function normalizeCityLabel(value: string, maxLength = 80): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function nicheLabel(value: NicheValue): string {
  return NICHES.find((n) => n.value === value)?.label ?? "Negócio local";
}

function cityMeta(value: CityValue) {
  return DEMO_CITIES.find((c) => c.value === value) ?? DEMO_CITIES[0];
}

function maskPhone(ddd: string, tail: string): string {
  return `(${ddd}) 9****-${tail}`;
}

function buildDemoLeads(niche: NicheValue, cityLabel: string, ddd: string): DemoLead[] {
  return LEAD_TEMPLATES[niche].map((template) => ({
    name: `${template.nameStem} ${cityLabel}`,
    rating: template.rating,
    phone: maskPhone(ddd, template.phoneTail),
    tier: template.tier,
  }));
}

function tierChipClass(tier: DemoLead["tier"]): string {
  return tier === "quente"
    ? "bg-[var(--hot)] text-[var(--hot-ink)]"
    : "bg-[var(--won)] text-[var(--won-ink)]";
}

function tierLabel(tier: DemoLead["tier"]): string {
  return tier === "quente" ? "Quente" : "Morno";
}

export default function MiniDemo() {
  const reduceMotion = useReducedMotion();
  const formId = useId();
  const [niche, setNiche] = useState<NicheValue>("dentista");
  const [city, setCity] = useState<CityValue>("campinas");
  const [leads, setLeads] = useState<DemoLead[] | null>(null);
  const [resultsHeading, setResultsHeading] = useState("");
  const [liveMessage, setLiveMessage] = useState("");

  const showLeads = useCallback(() => {
    const { label, ddd } = cityMeta(city);
    const safeLabel = normalizeCityLabel(label);
    const sample = buildDemoLeads(niche, safeLabel, ddd);
    const labelNiche = nicheLabel(niche);
    setLeads(sample);
    setResultsHeading(`${sample.length} leads demonstrativos de ${labelNiche} em ${safeLabel}`);
    setLiveMessage(
      `${sample.length} leads de exemplo para ${labelNiche} em ${safeLabel}. Dados fictícios.`,
    );
  }, [city, niche]);

  return (
    <section
      id="mini-demo"
      aria-labelledby={`${formId}-heading`}
      className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="max-w-2xl" data-reveal>
        <p className="marketing-eyebrow text-sm font-semibold">Experimente agora</p>
        <h2 id={`${formId}-heading`} className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
          Veja como os leads aparecem na busca.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-3)]">
          Escolha um nicho e uma cidade. Os resultados abaixo são fictícios e servem só para visualizar o fluxo.
        </p>
      </div>

      <div
        className="mt-12 rounded-[var(--radius-card)] border border-black/[0.06] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8"
        data-reveal
      >
        <form
          className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            showLeads();
          }}
        >
          <div>
            <label htmlFor={`${formId}-niche`} className="text-sm font-semibold text-[var(--text-2)]">
              Nicho
            </label>
            <select
              id={`${formId}-niche`}
              name="niche"
              required
              value={niche}
              onChange={(event) => setNiche(event.target.value as NicheValue)}
              className={`mt-2 min-h-11 w-full rounded-[var(--radius-ctl)] border border-black/[0.1] bg-[var(--neu-bg-pop)] px-3 py-2.5 text-sm font-medium text-[var(--text)] ${FOCUS}`}
            >
              {NICHES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${formId}-city`} className="text-sm font-semibold text-[var(--text-2)]">
              Cidade
            </label>
            <select
              id={`${formId}-city`}
              name="city"
              required
              value={city}
              onChange={(event) => setCity(event.target.value as CityValue)}
              className={`mt-2 min-h-11 w-full rounded-[var(--radius-ctl)] border border-black/[0.1] bg-[var(--neu-bg-pop)] px-3 py-2.5 text-sm font-medium text-[var(--text)] ${FOCUS}`}
            >
              {DEMO_CITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className={`marketing-button marketing-button-primary inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-semibold shadow-[0_8px_24px_rgba(0,113,227,0.22)] sm:min-w-[12rem] ${FOCUS}`}
          >
            <MagnifyingGlass size={18} weight="bold" aria-hidden />
            Ver leads de exemplo
          </button>
        </form>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </p>

        {leads && leads.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">{resultsHeading}</h3>
            <ul
              className="mt-5 grid gap-4 sm:grid-cols-3"
              role="list"
              aria-label="Leads de exemplo"
            >
              {leads.map((lead, index) => (
                <motion.li
                  key={`${lead.name}-${lead.phone}`}
                  className="list-none rounded-2xl border border-black/[0.06] bg-[var(--neu-bg-pop)] p-4"
                  initial={
                    reduceMotion ? false : { opacity: 0, transform: "translateY(14px)" }
                  }
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tierChipClass(lead.tier)}`}
                    >
                      {tierLabel(lead.tier)}
                    </span>
                    <span className="rounded-[var(--radius-chip)] bg-[var(--neu-bg-well)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-3)]">
                      Sem site
                    </span>
                  </div>
                  <h4 className="mt-3 text-base font-semibold tracking-tight text-[var(--text)]">{lead.name}</h4>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--text-3)]">
                    <Star size={16} weight="fill" className="text-[var(--warning)]" aria-hidden />
                    <span>
                      <span className="font-semibold text-[var(--text-2)] tabular-nums">
                        {lead.rating.toFixed(1)}
                      </span>
                      <span className="sr-only"> de 5 estrelas</span>
                    </span>
                  </p>
                  <p className="mt-2 text-sm font-medium tabular-nums text-[var(--text-2)]">{lead.phone}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 border-t border-black/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/cadastro"
            className={`marketing-link inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--brand)] hover:text-[var(--brand-hover)] ${FOCUS}`}
          >
            Criar conta para buscar leads reais
            <ArrowRight size={17} weight="bold" className="marketing-arrow" aria-hidden />
          </Link>
          <p className="text-xs font-medium text-[var(--text-4)]">Dados demonstrativos</p>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, MagnifyingGlass, Star } from "@phosphor-icons/react";
import sanitizeHtml from "sanitize-html";
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

type DemoLead = {
  name: string;
  rating: number;
  phone: string;
  tier: "quente" | "morno";
};

const DEMO_LEADS: Record<NicheValue, DemoLead[]> = {
  dentista: [
    { name: "Clínica Sorriso Norte", rating: 4.7, phone: "(19) 3371-4820", tier: "quente" },
    { name: "Odonto Viva Piracicaba", rating: 4.4, phone: "(19) 3402-1198", tier: "morno" },
    { name: "Dra. Helena Campos Odontologia", rating: 4.9, phone: "(19) 3425-6671", tier: "quente" },
  ],
  salao: [
    { name: "Studio Bella Cabelo", rating: 4.8, phone: "(19) 3361-9033", tier: "quente" },
    { name: "Espaço Charme Unhas", rating: 4.2, phone: "(19) 3398-4410", tier: "morno" },
    { name: "Salão Dona Flor", rating: 4.5, phone: "(19) 3411-2287", tier: "morno" },
  ],
  petshop: [
    { name: "Pet Amigo Center", rating: 4.6, phone: "(19) 3388-5520", tier: "quente" },
    { name: "Banho & Tosa Patas Felizes", rating: 4.3, phone: "(19) 3433-9014", tier: "morno" },
    { name: "Mundo Animal Piracicaba", rating: 4.1, phone: "(19) 3355-7782", tier: "morno" },
  ],
  academia: [
    { name: "Iron Fit Academia", rating: 4.5, phone: "(19) 3377-6601", tier: "quente" },
    { name: "Corpo em Movimento", rating: 4.0, phone: "(19) 3409-3318", tier: "morno" },
    { name: "Studio Pilates & Funcional", rating: 4.7, phone: "(19) 3420-8845", tier: "quente" },
  ],
  restaurante: [
    { name: "Sabor da Roça", rating: 4.8, phone: "(19) 3366-1144", tier: "quente" },
    { name: "Cantina do Lago", rating: 4.2, phone: "(19) 3391-7720", tier: "morno" },
    { name: "Bistrô Central", rating: 4.6, phone: "(19) 3418-5593", tier: "quente" },
  ],
};

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

function sanitizeDisplayText(value: string, maxLength = 80): string {
  const stripped = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  return stripped.slice(0, maxLength);
}

function nicheLabel(value: NicheValue): string {
  return NICHES.find((n) => n.value === value)?.label ?? "Negócio local";
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
  const [city, setCity] = useState("");
  const [leads, setLeads] = useState<DemoLead[] | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const showLeads = useCallback(() => {
    const safeCity = sanitizeDisplayText(city) || "Piracicaba";
    const sample = DEMO_LEADS[niche];
    setLeads(sample);
    setLiveMessage(
      `${sample.length} leads de exemplo para ${nicheLabel(niche)} em ${safeCity}. Dados fictícios.`,
    );
  }, [city, niche]);

  return (
    <section
      id="mini-demo"
      aria-labelledby={`${formId}-heading`}
      className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="max-w-2xl" data-reveal>
        <p className="text-sm font-semibold text-[var(--brand)]">Experimente agora</p>
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
            <input
              id={`${formId}-city`}
              name="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Piracicaba"
              autoComplete="address-level2"
              className={`mt-2 min-h-11 w-full rounded-[var(--radius-ctl)] border border-black/[0.1] bg-[var(--neu-bg-pop)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-5)] ${FOCUS}`}
            />
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
          <ul className="mt-8 grid gap-4 sm:grid-cols-3" role="list" aria-label="Leads de exemplo">
            {leads.map((lead, index) => (
              <motion.li
                key={lead.name}
                className="list-none rounded-2xl border border-black/[0.06] bg-[var(--neu-bg-pop)] p-4"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
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
                <h3 className="mt-3 text-base font-semibold tracking-tight text-[var(--text)]">{lead.name}</h3>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--text-3)]">
                  <Star size={16} weight="fill" className="text-[var(--warning)]" aria-hidden />
                  <span>
                    <span className="font-semibold text-[var(--text-2)] tabular-nums">{lead.rating.toFixed(1)}</span>
                    <span className="sr-only"> de 5 estrelas</span>
                  </span>
                </p>
                <p className="mt-2 text-sm font-medium tabular-nums text-[var(--text-2)]">{lead.phone}</p>
              </motion.li>
            ))}
          </ul>
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

"use client";

import { LayoutGroup, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type ChipTier = "quente" | "morno";

type KanbanCardData = {
  id: string;
  name: string;
  meta: string;
  chip: ChipTier | null;
  layoutId?: string;
};

type KanbanColumnData = {
  title: string;
  cards: KanbanCardData[];
  minSlots: number;
};

const SORRISO_ID = "clinica-sorriso";

const columnsStart: KanbanColumnData[] = [
  {
    title: "Base",
    minSlots: 2,
    cards: [
      { id: "auto-mecanica", name: "Auto Mecânica Norte", meta: "Sem site", chip: null },
      { id: "sabor-roca", name: "Sabor da Roça", meta: "Site desatualizado", chip: "morno" },
    ],
  },
  {
    title: "Abordado",
    minSlots: 2,
    cards: [
      {
        id: SORRISO_ID,
        name: "Clínica Sorriso",
        meta: "Link enviado",
        chip: "quente",
        layoutId: "journey-kanban-sorriso",
      },
      { id: "studio-fit", name: "Studio Fit", meta: "Aguardando resposta", chip: "morno" },
    ],
  },
  {
    title: "Follow Up",
    minSlots: 3,
    cards: [
      { id: "pet-shop", name: "Pet Shop Amigo", meta: "2 visitas no link", chip: "quente" },
      { id: "advocacia-lima", name: "Advocacia Lima", meta: "Retorno agendado", chip: null },
    ],
  },
];

function columnsAtFollowUp(): KanbanColumnData[] {
  return [
    columnsStart[0],
    {
      ...columnsStart[1],
      cards: columnsStart[1].cards.filter((card) => card.id !== SORRISO_ID),
    },
    {
      ...columnsStart[2],
      cards: [
        {
          id: SORRISO_ID,
          name: "Clínica Sorriso",
          meta: "1 visita no link",
          chip: "quente",
          layoutId: "journey-kanban-sorriso",
        },
        ...columnsStart[2].cards,
      ],
    },
  ];
}

const HOLD_START_MS = 2000;
const HOLD_FOLLOWUP_MS = 3000;
const FADE_MS = 500;
const LAYOUT_SETTLE_MS = 400;
const CYCLE_MS = HOLD_START_MS + LAYOUT_SETTLE_MS + HOLD_FOLLOWUP_MS + FADE_MS + HOLD_START_MS;

function subscribeVisibility(onStoreChange: () => void) {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}

function getTabVisible() {
  return document.visibilityState === "visible";
}

function TierChip({ tier }: { tier: ChipTier }) {
  if (tier === "quente") {
    return (
      <span className="marketing-chip-hot mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold">
        Quente
      </span>
    );
  }
  return (
    <span className="mb-1 inline-block rounded-full bg-[var(--neu-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-3)]">
      Morno
    </span>
  );
}

function KanbanCard({
  card,
  fadeOpacity,
}: {
  card: KanbanCardData;
  fadeOpacity: number;
}) {
  if (card.layoutId) {
    return (
      <motion.li
        layout
        layoutId={card.layoutId}
        style={{ opacity: fadeOpacity }}
        transition={{ layout: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
        className="rounded-lg border border-black/[0.06] bg-white p-2.5 shadow-sm"
      >
        {card.chip ? <TierChip tier={card.chip} /> : null}
        <p className="truncate text-xs font-semibold text-[var(--text)]">{card.name}</p>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-3)]">{card.meta}</p>
      </motion.li>
    );
  }

  return (
    <li className="rounded-lg border border-black/[0.06] bg-white p-2.5 shadow-sm">
      {card.chip ? <TierChip tier={card.chip} /> : null}
      <p className="truncate text-xs font-semibold text-[var(--text)]">{card.name}</p>
      <p className="mt-0.5 truncate text-[10px] text-[var(--text-3)]">{card.meta}</p>
    </li>
  );
}

export function JourneyKanbanLive() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.2 });
  const reduceMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const tabVisible = useSyncExternalStore(subscribeVisibility, getTabVisible, () => true);

  const [stickyMode, setStickyMode] = useState<boolean | null>(null);
  const [panelActive, setPanelActive] = useState(false);
  const [atFollowUp, setAtFollowUp] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(1);

  const staticReduced = hydrated && reduceMotion;
  const shouldRunCycle =
    stickyMode !== null &&
    !staticReduced &&
    tabVisible &&
    (stickyMode ? panelActive : inView);

  const displayAtFollowUp = staticReduced ? true : shouldRunCycle ? atFollowUp : false;
  const columns = displayAtFollowUp ? columnsAtFollowUp() : columnsStart;

  useEffect(() => {
    const panel = rootRef.current?.closest("[data-journey-panel]");
    if (!(panel instanceof HTMLElement)) {
      const id = window.requestAnimationFrame(() => setStickyMode(false));
      return () => window.cancelAnimationFrame(id);
    }

    const readActive = () => {
      setPanelActive(panel.getAttribute("data-active") === "true");
    };

    const setupId = window.requestAnimationFrame(() => {
      setStickyMode(true);
      readActive();
    });

    const observer = new MutationObserver(readActive);
    observer.observe(panel, { attributes: true, attributeFilter: ["data-active"] });
    return () => {
      window.cancelAnimationFrame(setupId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!shouldRunCycle) {
      return undefined;
    }

    let cancelled = false;
    const timers: number[] = [];

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(id);
    };

    const startCycle = () => {
      if (cancelled) return;
      setAtFollowUp(false);
      setFadeOpacity(1);
      later(() => setAtFollowUp(true), HOLD_START_MS);
      later(() => setFadeOpacity(0), HOLD_START_MS + LAYOUT_SETTLE_MS + HOLD_FOLLOWUP_MS);
      later(() => {
        setAtFollowUp(false);
        setFadeOpacity(1);
      }, HOLD_START_MS + LAYOUT_SETTLE_MS + HOLD_FOLLOWUP_MS + FADE_MS);
      later(startCycle, CYCLE_MS);
    };

    startCycle();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [shouldRunCycle]);

  const sorrisoFade = displayAtFollowUp && fadeOpacity < 1 ? fadeOpacity : 1;

  return (
    <div ref={rootRef} className="mt-4 grid gap-3 sm:grid-cols-3">
      <LayoutGroup id="journey-kanban-priorize">
        {columns.map((column) => (
          <div key={column.title} className="min-w-0 rounded-xl bg-[var(--neu-bg)] p-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">
              {column.title}
            </p>
            <ul
              className="mt-2 space-y-2"
              style={{
                minHeight: `calc(${column.minSlots} * 4.75rem + ${Math.max(0, column.minSlots - 1)} * 0.5rem)`,
              }}
            >
              {column.cards.map((card) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  fadeOpacity={card.id === SORRISO_ID ? sorrisoFade : 1}
                />
              ))}
            </ul>
          </div>
        ))}
      </LayoutGroup>
    </div>
  );
}

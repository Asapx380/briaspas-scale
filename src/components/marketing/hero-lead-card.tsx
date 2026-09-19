"use client";

import { Buildings } from "@phosphor-icons/react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type DemoPhase = 1 | 2 | 3 | 4;

const PHASE_MS = 3000;
const NOTICE_VISIBLE_MS = 900;

const secondaryChipByPhase: Record<
  DemoPhase,
  { key: string; label: string; className: string }
> = {
  1: {
    key: "sem-site",
    label: "Sem site",
    className: "rounded-full bg-[var(--neu-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-3)]",
  },
  2: {
    key: "site-demo",
    label: "Site-demo publicado",
    className:
      "rounded-full bg-[var(--brand-tint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]",
  },
  3: {
    key: "abordado",
    label: "Abordado",
    className: "rounded-full bg-[var(--neu-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-3)]",
  },
  4: {
    key: "follow-up",
    label: "Follow Up",
    className: "rounded-full bg-[var(--neu-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-3)]",
  },
};

function subscribeVisibility(onStoreChange: () => void) {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}

function getTabVisible() {
  return document.visibilityState === "visible";
}

export function HeroLeadCard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.15 });
  const reduceMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const tabVisible = useSyncExternalStore(subscribeVisibility, getTabVisible, () => true);
  const [phase, setPhase] = useState<DemoPhase>(1);
  const [visitCount, setVisitCount] = useState(0);
  const [noticeVisible, setNoticeVisible] = useState(false);

  const staticReduced = hydrated && reduceMotion;
  const displayPhase: DemoPhase = staticReduced ? 4 : phase;
  const displayVisitCount = staticReduced ? 3 : displayPhase === 4 ? visitCount : 0;
  const showVisits = displayPhase === 4;

  useEffect(() => {
    if (staticReduced || !inView || !tabVisible) return;

    const timer = window.setInterval(() => {
      setPhase((current) => ((current % 4) + 1) as DemoPhase);
    }, PHASE_MS);

    return () => window.clearInterval(timer);
  }, [staticReduced, inView, tabVisible]);

  useEffect(() => {
    if (staticReduced || displayPhase !== 4 || !inView || !tabVisible) return;

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setVisitCount(0);
        setNoticeVisible(false);
      }, 0),
    );

    const steps = [1, 2, 3] as const;
    steps.forEach((count, index) => {
      const at = window.setTimeout(() => {
        setVisitCount(count);
        setNoticeVisible(true);
        const hide = window.setTimeout(() => {
          setNoticeVisible(false);
        }, NOTICE_VISIBLE_MS);
        timers.push(hide);
      }, 650 + index * 750);
      timers.push(at);
    });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [displayPhase, staticReduced, inView, tabVisible]);

  const chip = secondaryChipByPhase[displayPhase];

  return (
    <div
      ref={rootRef}
      className="relative mt-3 max-w-[min(100%,18rem)] sm:absolute sm:right-4 sm:bottom-2 sm:mt-0 sm:w-[15.5rem]"
    >
      <motion.p
        aria-hidden="true"
        className="pointer-events-none absolute right-0 -top-7 left-0 z-10 truncate text-right text-[10px] font-medium text-[var(--brand)] sm:-top-6 sm:max-w-none"
        initial={false}
        animate={
          noticeVisible && showVisits && !staticReduced
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 6 }
        }
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        Visita registrada no link da Clínica Sorriso
      </motion.p>

      <div className="rounded-2xl border border-black/[0.08] bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--neu-bg)] text-[var(--text-3)]">
            <Buildings size={18} weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex h-6 min-h-6 flex-wrap items-center gap-1.5 overflow-hidden">
              <span className="marketing-chip-hot shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Quente
              </span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={chip.key}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`shrink-0 truncate ${chip.className}`}
                >
                  {chip.label}
                </motion.span>
              </AnimatePresence>
            </div>
            <p className="mt-1.5 truncate text-sm font-semibold text-[var(--text)]">Clínica Sorriso</p>
            <p className="truncate text-[11px] text-[var(--text-3)]">Campinas, SP</p>
            <div className="mt-1.5 h-4">
              <AnimatePresence mode="wait" initial={false}>
                {showVisits ? (
                  <motion.p
                    key="visits"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[10px] text-[var(--text-3)]"
                  >
                    Visitas ao link{" "}
                    <span className="font-bold tabular-nums text-[var(--text)]">{displayVisitCount}</span>
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

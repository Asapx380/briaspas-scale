"use client";

import { Info } from "@phosphor-icons/react/dist/csr/Info";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  COMMERCIAL_POTENTIAL_DISCLAIMER,
  commercialPotentialAriaLabel,
  commercialPotentialBand,
  commercialPotentialClassLabel,
  commercialPotentialScoreFactors,
  type CommercialPotentialBand,
} from "@/lib/crm/pipeline";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

const BAND_STYLE: Record<
  CommercialPotentialBand,
  {
    badge: string;
    chip: string;
    barTrack: string;
    barFill: string;
    accent: string;
  }
> = {
  low: {
    badge: "bg-[var(--potential-low-fill)] text-white",
    chip: "bg-[var(--potential-low-bg)] text-[var(--potential-low-ink)] border border-[var(--potential-low-border)]/25",
    barTrack: "bg-[var(--potential-low-bg)]",
    barFill: "bg-[var(--potential-low-fill)]",
    accent: "border-l-[var(--potential-low-border)]",
  },
  medium: {
    badge: "bg-[var(--potential-medium-fill)] text-white",
    chip: "bg-[var(--potential-medium-bg)] text-[var(--potential-medium-ink)] border border-[var(--potential-medium-border)]/25",
    barTrack: "bg-[var(--potential-medium-bg)]",
    barFill: "bg-[var(--potential-medium-fill)]",
    accent: "border-l-[var(--potential-medium-border)]",
  },
  high: {
    badge: "bg-[var(--potential-high-fill)] text-white",
    chip: "bg-[var(--potential-high-bg)] text-[var(--potential-high-ink)] border border-[var(--potential-high-border)]/25",
    barTrack: "bg-[var(--potential-high-bg)]",
    barFill: "bg-[var(--potential-high-fill)]",
    accent: "border-l-[var(--potential-high-border)]",
  },
};

export function commercialPotentialAccentClass(score: number): string {
  const band = commercialPotentialBand(score);
  return `border-l-4 ${BAND_STYLE[band].accent}`;
}

type CommercialPotentialIndicatorProps = {
  score: number;
  variant?: "compact" | "detail";
  showBar?: boolean;
  showTooltip?: boolean;
  className?: string;
};

function PotentialTooltip({ id }: { id: string }) {
  const factors = commercialPotentialScoreFactors();
  return (
    <div
      id={id}
      role="tooltip"
      className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left shadow-[var(--shadow-card)]"
    >
      <p className="text-sm font-semibold text-[var(--text)]">Como este potencial foi calculado</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-4)]">
        Soma heurística (0 a 100) com base nos dados do lead:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--text-3)]">
        {factors.map((factor) => (
          <li key={factor}>{factor}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-[var(--text-4)]">{COMMERCIAL_POTENTIAL_DISCLAIMER}</p>
    </div>
  );
}

export function CommercialPotentialIndicator({
  score,
  variant = "compact",
  showBar = false,
  showTooltip = false,
  className = "",
}: CommercialPotentialIndicatorProps) {
  const band = commercialPotentialBand(score);
  const label = commercialPotentialClassLabel(band);
  const styles = BAND_STYLE[band];
  const aria = commercialPotentialAriaLabel(score);
  const tooltipId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const closeTooltip = useCallback(() => setTooltipOpen(false), []);

  useEffect(() => {
    if (!tooltipOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeTooltip();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [tooltipOpen, closeTooltip]);

  function onTooltipKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeTooltip();
    }
  }

  const percent = `${score}%`;
  const barVisible = showBar || variant === "detail";

  return (
    <div ref={rootRef} className={className}>
      <div
        className={`flex flex-wrap items-center gap-2 ${variant === "detail" ? "gap-3" : ""}`}
        aria-label={aria}
      >
        {variant === "detail" && (
          <p className="w-full text-sm font-semibold text-[var(--text)]">Potencial comercial</p>
        )}
        <span
          className={`inline-flex min-w-9 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${styles.badge}`}
        >
          {percent}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles.chip}`}>
          {label}
        </span>
        {showTooltip && (
          <div className="relative">
            <button
              type="button"
              className={`grid size-8 place-items-center rounded-lg text-[var(--text-4)] hover:bg-[var(--neu-bg-well)] hover:text-[var(--text-2)] ${FOCUS}`}
              aria-label="Como este potencial foi calculado"
              aria-expanded={tooltipOpen}
              aria-controls={tooltipId}
              aria-describedby={tooltipOpen ? tooltipId : undefined}
              onClick={() => setTooltipOpen((open) => !open)}
              onKeyDown={onTooltipKeyDown}
            >
              <Info size={16} weight="bold" aria-hidden />
            </button>
            {tooltipOpen && <PotentialTooltip id={tooltipId} />}
          </div>
        )}
      </div>
      {barVisible && (
        <div
          className={`mt-2 h-2 w-full overflow-hidden rounded-full ${styles.barTrack}`}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={aria}
        >
          <div
            className={`h-full rounded-full transition-[width] motion-reduce:transition-none ${styles.barFill}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
      {variant === "detail" && (
        <p className="mt-2 text-xs leading-5 text-[var(--text-4)]">
          Estimativa heurística a partir dos dados do lead. Não é probabilidade de fechamento.{" "}
          {COMMERCIAL_POTENTIAL_DISCLAIMER}
        </p>
      )}
    </div>
  );
}

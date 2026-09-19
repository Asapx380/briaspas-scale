type SpinnerProps = {
  className?: string;
  label?: string;
};

/** Compact spinner for pending buttons/actions. Respects prefers-reduced-motion via CSS. */
export function Spinner({ className = "size-4", label }: SpinnerProps) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent animate-spin ${className}`}
      role={label ? "status" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

type SkeletonBarProps = {
  className?: string;
};

/** Visible skeleton bar for light neumorphic backgrounds. */
export function SkeletonBar({ className = "h-4 w-full" }: SkeletonBarProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--neu-bg-well)] ${className}`}
      aria-hidden="true"
    />
  );
}

type SkeletonRowsProps = {
  count?: number;
  className?: string;
  label?: string;
};

export function SkeletonRows({ count = 3, className = "", label = "Carregando" }: SkeletonRowsProps) {
  return (
    <div className={className} aria-busy="true" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border-t border-[var(--border)] py-6 first:border-t-0">
          <SkeletonBar className="h-5 w-2/5" />
          <SkeletonBar className="mt-4 h-4 w-1/4" />
          <SkeletonBar className="mt-3 h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}

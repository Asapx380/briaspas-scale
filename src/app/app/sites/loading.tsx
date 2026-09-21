import { SkeletonBar } from "@/components/ui/async-feedback";

export default function SitesLoading() {
  return (
    <main
      className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10"
      aria-busy="true"
      aria-label="Carregando Meus sites"
    >
      <SkeletonBar className="h-4 w-16 bg-[var(--brand-solid)]/15" />
      <SkeletonBar className="mt-4 h-10 w-48" />
      <SkeletonBar className="mt-3 h-5 w-full max-w-xl" />
      <SkeletonBar className="mt-8 h-11 max-w-md rounded-2xl" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBar
            key={index}
            className="h-72 rounded-2xl border border-[var(--border)] bg-[var(--card)]"
          />
        ))}
      </div>
    </main>
  );
}

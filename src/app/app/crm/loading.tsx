import { SkeletonBar } from "@/components/ui/async-feedback";

export default function CrmLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14" aria-busy="true" aria-label="Carregando CRM">
      <SkeletonBar className="h-4 w-32 bg-[var(--brand)]/15" />
      <SkeletonBar className="mt-4 h-11 w-56" />
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((column) => (
          <SkeletonBar key={column} className="h-64 rounded-2xl border border-black/5 bg-white" />
        ))}
      </div>
    </main>
  );
}

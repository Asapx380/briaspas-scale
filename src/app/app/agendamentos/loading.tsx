import { SkeletonBar } from "@/components/ui/async-feedback";

export default function AgendamentosLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10" aria-busy="true" aria-label="Carregando agendamentos">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SkeletonBar className="h-9 w-52" />
          <SkeletonBar className="mt-3 h-4 w-44" />
        </div>
        <SkeletonBar className="h-10 w-40 rounded-full" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <SkeletonBar key={item} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="app-card mt-5 p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, index) => (
            <SkeletonBar key={index} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}

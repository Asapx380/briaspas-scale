import { SkeletonBar } from "@/components/ui/async-feedback";

export default function AppDashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10" aria-busy="true" aria-label="Carregando dashboard">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SkeletonBar className="h-9 w-48" />
          <SkeletonBar className="mt-3 h-4 w-40" />
        </div>
        <SkeletonBar className="h-10 w-44 rounded-full" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="app-card p-5">
            <SkeletonBar className="h-3 w-20" />
            <SkeletonBar className="mt-3 h-8 w-16" />
            <SkeletonBar className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="app-card h-64 p-5">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="mt-6 h-40 w-full rounded-xl" />
        </div>
        <div className="app-card h-64 p-5">
          <SkeletonBar className="h-4 w-36" />
          <SkeletonBar className="mt-6 h-40 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}

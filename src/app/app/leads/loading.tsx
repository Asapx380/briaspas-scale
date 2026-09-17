import { SkeletonBar } from "@/components/ui/async-feedback";

export default function LeadsLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10" aria-busy="true" aria-label="Carregando leads">
      <SkeletonBar className="h-9 w-40" />
      <SkeletonBar className="mt-3 h-4 w-64" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <SkeletonBar key={item} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="app-card mt-6 p-5">
        <SkeletonBar className="h-11 w-full rounded-xl" />
        <div className="mt-6 space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <SkeletonBar className="h-5 w-2/5" />
              <SkeletonBar className="mt-3 h-4 w-3/5" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

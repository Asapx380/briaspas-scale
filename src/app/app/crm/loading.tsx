export default function CrmLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="h-4 w-32 animate-pulse rounded bg-[var(--brand)]/15" />
      <div className="mt-4 h-11 w-56 animate-pulse rounded-lg bg-white/10" />
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((column) => (
          <div key={column} className="h-64 animate-pulse rounded-2xl border border-black/5 bg-white" />
        ))}
      </div>
    </main>
  );
}

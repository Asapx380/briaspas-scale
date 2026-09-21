"use client";

import { useEffect } from "react";

type SitesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SitesError({ error, reset }: SitesErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <h1 className="text-2xl font-bold text-[var(--text)]">Meus sites</h1>
      <p role="alert" className="mt-4 max-w-lg text-sm leading-6 text-[var(--text-3)]">
        Não foi possível carregar a galeria. Verifique sua conexão e tente novamente.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-[var(--brand-solid)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      >
        Tentar novamente
      </button>
    </main>
  );
}

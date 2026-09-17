"use client";

import Link from "next/link";
import { PAGE_SIZE_OPTIONS, type PageMeta } from "@/lib/pagination/params";

type ListPaginationProps = {
  meta: PageMeta;
  /** Base path without query, e.g. `/app/equipe`. */
  pathname: string;
  /** Current query without page/pageSize overrides. */
  searchParams?: Record<string, string | undefined>;
  pageSizeOptions?: readonly number[];
  defaultPageSize?: number;
  label?: string;
  className?: string;
};

function hrefFor(
  pathname: string,
  searchParams: Record<string, string | undefined> | undefined,
  patch: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function ListPagination({
  meta,
  pathname,
  searchParams,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  defaultPageSize = 50,
  label = "Paginação da lista",
  className = "",
}: ListPaginationProps) {
  if (meta.total === 0) return null;

  const preserved: Record<string, string | undefined> = { ...searchParams };
  delete preserved.page;
  delete preserved.pageSize;

  const prevHref = hrefFor(pathname, preserved, {
    page: meta.page - 1 > 1 ? meta.page - 1 : null,
    pageSize: meta.pageSize === defaultPageSize ? null : meta.pageSize,
  });
  const nextHref = hrefFor(pathname, preserved, {
    page: meta.page + 1,
    pageSize: meta.pageSize === defaultPageSize ? null : meta.pageSize,
  });

  return (
    <nav
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      aria-label={label}
    >
      <p className="text-sm text-[var(--text-3)]" aria-live="polite">
        Mostrando{" "}
        <span className="font-medium tabular-nums text-[var(--text-2)]">
          {meta.from}–{meta.to}
        </span>{" "}
        de <span className="font-medium tabular-nums text-[var(--text-2)]">{meta.total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-3)]">
          <span>Por página</span>
          <select
            className="rounded-xl border border-black/8 bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--text-2)]"
            aria-label="Itens por página"
            defaultValue={meta.pageSize}
            onChange={(event) => {
              const next = hrefFor(pathname, preserved, {
                page: null,
                pageSize:
                  Number(event.target.value) === defaultPageSize ? null : event.target.value,
              });
              window.location.assign(next);
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <Link
          href={prevHref}
          aria-label="Página anterior"
          aria-disabled={!meta.hasPrev}
          tabIndex={meta.hasPrev ? 0 : -1}
          className={`rounded-xl border border-black/8 bg-white px-3 py-1.5 text-sm font-semibold ${
            meta.hasPrev
              ? "text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)]"
              : "pointer-events-none text-[var(--text-4)] opacity-50"
          }`}
        >
          Anterior
        </Link>
        <span className="min-w-16 text-center text-sm tabular-nums text-[var(--text-3)]">
          {meta.page}/{meta.totalPages}
        </span>
        <Link
          href={nextHref}
          aria-label="Próxima página"
          aria-disabled={!meta.hasNext}
          tabIndex={meta.hasNext ? 0 : -1}
          className={`rounded-xl border border-black/8 bg-white px-3 py-1.5 text-sm font-semibold ${
            meta.hasNext
              ? "text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)]"
              : "pointer-events-none text-[var(--text-4)] opacity-50"
          }`}
        >
          Próxima
        </Link>
      </div>
    </nav>
  );
}

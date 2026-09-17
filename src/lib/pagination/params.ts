export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  hasPrev: boolean;
  hasNext: boolean;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: string | string[] | undefined): number {
  const raw = Number.parseInt(firstParam(value) ?? "", 10);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_PAGE;
  return Math.min(raw, 10_000);
}

export function parsePageSize(
  value: string | string[] | undefined,
  options: readonly number[] = PAGE_SIZE_OPTIONS,
  fallback: number = DEFAULT_PAGE_SIZE,
): number {
  const raw = Number.parseInt(firstParam(value) ?? "", 10);
  if (options.includes(raw)) return raw;
  return fallback;
}

export function rangeFromPage(page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  return { from, to };
}

export function buildPageMeta(total: number, page: number, pageSize: number): PageMeta {
  const safeTotal = Math.max(0, total);
  const safeSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const { from, to } = rangeFromPage(safePage, safeSize);
  return {
    page: safePage,
    pageSize: safeSize,
    total: safeTotal,
    totalPages,
    from: safeTotal === 0 ? 0 : from + 1,
    to: Math.min(to + 1, safeTotal),
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages && safeTotal > 0,
  };
}

export function paginationSearchParams(
  current: URLSearchParams | Record<string, string | undefined>,
  patch: Record<string, string | number | null | undefined>,
): string {
  const params =
    current instanceof URLSearchParams
      ? new URLSearchParams(current)
      : new URLSearchParams(
          Object.entries(current).filter((entry): entry is [string, string] => Boolean(entry[1])),
        );

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

/** Batch size for scanning large tables without a single unbounded select. */
export const SCAN_BATCH_SIZE = 500;

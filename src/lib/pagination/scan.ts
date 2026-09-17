import { SCAN_BATCH_SIZE } from "./params";

type RangeQueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type RangeQueryable<T> = {
  range: (from: number, to: number) => PromiseLike<RangeQueryResult<T>> | RangeQueryResult<T>;
};

/**
 * Walks a Supabase-style query in fixed batches so callers never rely on a
 * single unbounded select (PostgREST default ~1000 row cap).
 */
export async function scanInBatches<T>(
  buildQuery: () => RangeQueryable<T>,
  options?: { batchSize?: number; maxRows?: number },
): Promise<{ rows: T[]; truncated: boolean; error: string | null }> {
  const batchSize = options?.batchSize ?? SCAN_BATCH_SIZE;
  const maxRows = options?.maxRows ?? Number.POSITIVE_INFINITY;
  const rows: T[] = [];
  let from = 0;

  while (rows.length < maxRows) {
    const to = from + batchSize - 1;
    const result = await buildQuery().range(from, to);
    if (result.error) {
      return { rows, truncated: false, error: result.error.message };
    }
    const chunk = result.data ?? [];
    if (chunk.length === 0) {
      return { rows, truncated: false, error: null };
    }
    const remaining = maxRows - rows.length;
    rows.push(...chunk.slice(0, remaining));
    if (chunk.length < batchSize || rows.length >= maxRows) {
      return {
        rows,
        truncated: rows.length >= maxRows && chunk.length === batchSize,
        error: null,
      };
    }
    from += batchSize;
  }

  return { rows, truncated: false, error: null };
}

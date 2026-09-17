import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  buildPageMeta,
  paginationSearchParams,
  parsePage,
  parsePageSize,
  rangeFromPage,
} from "./params";
import { scanInBatches } from "./scan";

describe("parsePage", () => {
  it("defaults and clamps invalid values", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(["4"])).toBe(4);
  });
});

describe("parsePageSize", () => {
  it("accepts only configured sizes", () => {
    expect(parsePageSize("25")).toBe(25);
    expect(parsePageSize("50")).toBe(50);
    expect(parsePageSize("100")).toBe(100);
    expect(parsePageSize("33")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize(undefined, [10, 20], 10)).toBe(10);
  });
});

describe("rangeFromPage / buildPageMeta", () => {
  it("computes inclusive ranges and navigation flags", () => {
    expect(rangeFromPage(1, 50)).toEqual({ from: 0, to: 49 });
    expect(rangeFromPage(2, 25)).toEqual({ from: 25, to: 49 });

    const meta = buildPageMeta(120, 2, 50);
    expect(meta).toMatchObject({
      page: 2,
      pageSize: 50,
      total: 120,
      totalPages: 3,
      from: 51,
      to: 100,
      hasPrev: true,
      hasNext: true,
    });

    const empty = buildPageMeta(0, 5, 50);
    expect(empty.page).toBe(1);
    expect(empty.from).toBe(0);
    expect(empty.to).toBe(0);
    expect(empty.hasNext).toBe(false);
  });
});

describe("paginationSearchParams", () => {
  it("patches and clears keys", () => {
    const qs = paginationSearchParams({ page: "2", q: "padaria" }, { page: 1, q: null, pageSize: 25 });
    const params = new URLSearchParams(qs);
    expect(params.get("page")).toBe("1");
    expect(params.get("pageSize")).toBe("25");
    expect(params.has("q")).toBe(false);
  });
});

describe("scanInBatches", () => {
  it("aggregates ranges until exhausted", async () => {
    const pages = [
      [1, 2],
      [3],
    ];
    let calls = 0;
    const { rows, truncated, error } = await scanInBatches<number>(
      () => ({
        range: async (from, to) => {
          const page = pages[calls] ?? [];
          calls += 1;
          expect(to - from + 1).toBe(2);
          return { data: page, error: null };
        },
      }),
      { batchSize: 2 },
    );
    expect(rows).toEqual([1, 2, 3]);
    expect(truncated).toBe(false);
    expect(error).toBeNull();
    expect(calls).toBe(2);
  });
});

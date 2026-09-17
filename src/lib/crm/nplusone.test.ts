import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRepresentativeLeads,
  createInstrumentedClient,
} from "./instrumented-client";
import {
  loadCrmBoardData,
  loadCrmBoardDataLegacy,
  loadCrmLeadDetail,
  loadCrmLeadDetailLegacy,
} from "./queries";
import { uploadSiteFilesParallel } from "../storage/upload-site-files";

const RTT_MS = 15;
const LEAD_COUNT = 200;

function writeMetrics(name: string, metrics: unknown) {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), "../../../.tmp");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, name), JSON.stringify(metrics, null, 2));
}

describe("N+1 CRM board", () => {
  it("reduz round-trips e wall time vs legado com 200 leads", async () => {
    const leads = buildRepresentativeLeads(LEAD_COUNT);
    const conversations = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      lead_id: i + 1,
      contact_name: `Contato ${i}`,
      contact_phone: "5511999990000",
      agent_enabled: true,
      last_message_at: new Date().toISOString(),
    }));

    const legacyClient = createInstrumentedClient(
      { leads, whatsapp_conversations: conversations },
      { rttMs: RTT_MS },
    );
    const legacyStarted = performance.now();
    const legacy = await loadCrmBoardDataLegacy(legacyClient);
    const legacyWall = performance.now() - legacyStarted;
    const legacyStats = legacyClient.getStats();

    const fixedClient = createInstrumentedClient(
      { leads, whatsapp_conversations: conversations },
      { rttMs: RTT_MS },
    );
    const fixedStarted = performance.now();
    const fixed = await loadCrmBoardData(fixedClient);
    const fixedWall = performance.now() - fixedStarted;
    const fixedStats = fixedClient.getStats();

    expect(legacy.queryCount).toBe(3);
    expect(fixed.queryCount).toBe(2);
    expect(legacyStats.queryCount).toBe(3);
    expect(fixedStats.queryCount).toBe(2);

    expect(fixed.leads).toHaveLength(LEAD_COUNT);
    expect(legacy.leads).toHaveLength(LEAD_COUNT);
    expect(fixed.leads[0].site_brief).toBeNull();
    expect(fixed.leads[0].ai_diagnosis).toBeNull();
    expect(fixedStats.bytesTransferred).toBeLessThan(legacyStats.bytesTransferred);

    expect(fixedWall).toBeLessThan(legacyWall);
    expect(fixedWall).toBeLessThan(RTT_MS * 2.2);
    expect(legacyWall).toBeGreaterThan(RTT_MS * 2.5);

    writeMetrics("nplusone-metrics-board.json", {
      method: "instrumented client + simulated RTT",
      rttMs: RTT_MS,
      leadCount: LEAD_COUNT,
      board: {
        before: {
          queries: legacyStats.queryCount,
          wallMs: Number(legacyWall.toFixed(2)),
          bytes: legacyStats.bytesTransferred,
        },
        after: {
          queries: fixedStats.queryCount,
          wallMs: Number(fixedWall.toFixed(2)),
          bytes: fixedStats.bytesTransferred,
        },
      },
    });
  });
});

describe("N+1 CRM detail", () => {
  it("reduz 3 selects sequenciais para 2 em paralelo", async () => {
    const leads = buildRepresentativeLeads(120);
    const legacyClient = createInstrumentedClient(
      { leads, whatsapp_conversations: [] },
      { rttMs: RTT_MS },
    );
    const legacyStarted = performance.now();
    const legacy = await loadCrmLeadDetailLegacy(legacyClient, "42");
    const legacyWall = performance.now() - legacyStarted;

    const fixedClient = createInstrumentedClient(
      { leads, whatsapp_conversations: [] },
      { rttMs: RTT_MS },
    );
    const fixedStarted = performance.now();
    const fixed = await loadCrmLeadDetail(fixedClient, "42");
    const fixedWall = performance.now() - fixedStarted;

    expect(legacy.notFound).toBe(false);
    expect(fixed.notFound).toBe(false);
    expect(legacy.queryCount).toBe(3);
    expect(fixed.queryCount).toBe(2);
    expect(fixed.lead?.ai_diagnosis).toBeTruthy();
    expect(fixed.siblingIds).toHaveLength(120);
    expect(fixedWall).toBeLessThan(legacyWall);
    expect(fixedWall).toBeLessThan(RTT_MS * 2.2);
    expect(legacyWall).toBeGreaterThan(RTT_MS * 2.5);

    writeMetrics("nplusone-metrics-detail.json", {
      detail: {
        before: { queries: legacy.queryCount, wallMs: Number(legacyWall.toFixed(2)) },
        after: { queries: fixed.queryCount, wallMs: Number(fixedWall.toFixed(2)) },
      },
    });
  });
});

describe("N+1 storage upload", () => {
  it("upload paralelo corta wall time vs loop sequencial", async () => {
    const files = Array.from({ length: 12 }, (_, i) => ({
      path: i === 0 ? "index.html" : `asset-${i}.css`,
      content: Buffer.from(`/* file ${i} */`),
      contentType: i === 0 ? "text/html" : "text/css",
    }));

    const sequentialClient = createInstrumentedClient(
      { leads: [], whatsapp_conversations: [] },
      { rttMs: RTT_MS },
    );
    const seqStarted = performance.now();
    for (const file of files) {
      await sequentialClient.storage
        .from("lead-sites")
        .upload(`leads/1/site/${file.path}`, file.content, {
          contentType: file.contentType,
          upsert: false,
        });
    }
    const seqWall = performance.now() - seqStarted;
    const seqStats = sequentialClient.getStats();

    const parallelClient = createInstrumentedClient(
      { leads: [], whatsapp_conversations: [] },
      { rttMs: RTT_MS },
    );
    const parStarted = performance.now();
    const result = await uploadSiteFilesParallel(
      parallelClient.storage.from("lead-sites"),
      "leads/1/site",
      files,
      { concurrency: 6 },
    );
    const parWall = performance.now() - parStarted;
    const parStats = parallelClient.getStats();

    expect(result.error).toBeNull();
    expect(seqStats.queryCount).toBe(12);
    expect(parStats.queryCount).toBe(12);
    expect(parWall).toBeLessThan(seqWall);
    expect(seqWall).toBeGreaterThan(RTT_MS * 10);
    expect(parWall).toBeLessThan(RTT_MS * 4);

    writeMetrics("nplusone-metrics-storage.json", {
      storage12files: {
        before: { queries: 12, wallMs: Number(seqWall.toFixed(2)) },
        after: { queries: 12, wallMs: Number(parWall.toFixed(2)), concurrency: 6 },
      },
    });
  });
});

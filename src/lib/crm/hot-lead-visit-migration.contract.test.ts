import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/202609200001_hot_lead_visit_threshold.sql",
);

describe("track_public_lead_site_visit migration (contrato SQL)", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("serializa e deduplica notificações por lead", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("workspace_notifications_hot_lead_one_per_lead_day_idx");
    expect(sql).toMatch(/on conflict do nothing/i);
  });

  it("grava viewed_on em America/Sao_Paulo e não alerta em prévia", () => {
    expect(sql).toContain("visit_day := (timezone('America/Sao_Paulo', now()))::date");
    expect(sql).toContain("if target_is_preview then");
    expect(sql).toContain("vezes nas últimas 24 horas");
    expect(sql).not.toContain("visitCountToday");
  });
});

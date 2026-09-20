import { describe, expect, it } from "vitest";
import { hotLeadPgIntegrationEnabled, isLocalOrStagingDatabaseUrl } from "./hot-lead-pg-test-env";

describe("hot-lead-pg-test-env", () => {
  it("aceita apenas localhost, staging ou porta local Supabase", () => {
    expect(isLocalOrStagingDatabaseUrl("postgresql://u:p@127.0.0.1:54322/postgres")).toBe(true);
    expect(isLocalOrStagingDatabaseUrl("postgresql://u:p@localhost:5432/db")).toBe(true);
    expect(isLocalOrStagingDatabaseUrl("postgresql://u:p@db.staging.example.com:5432/db")).toBe(true);
    expect(isLocalOrStagingDatabaseUrl("postgresql://u:p@db.prod.example.com:5432/db")).toBe(false);
  });

  it("exige HOT_LEAD_PG_INTEGRATION=1", () => {
    const prev = process.env.HOT_LEAD_PG_INTEGRATION;
    const prevUrl = process.env.DATABASE_URL;
    process.env.HOT_LEAD_PG_INTEGRATION = "1";
    process.env.DATABASE_URL = "postgresql://u:p@127.0.0.1:54322/postgres";
    expect(hotLeadPgIntegrationEnabled()).toBe(true);
    process.env.HOT_LEAD_PG_INTEGRATION = "0";
    expect(hotLeadPgIntegrationEnabled()).toBe(false);
    process.env.HOT_LEAD_PG_INTEGRATION = prev;
    process.env.DATABASE_URL = prevUrl;
  });
});

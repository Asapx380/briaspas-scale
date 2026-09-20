import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool, PoolClient } from "pg";
import { hotLeadPgIntegrationEnabled } from "./hot-lead-pg-test-env";

const runPgIntegration = hotLeadPgIntegrationEnabled();
const databaseUrl = process.env.DATABASE_URL;

function sessionHash(seed: string) {
  return createHash("sha256").update(seed).digest("hex");
}

async function trackVisit(client: PoolClient, slug: string, seed: string) {
  await client.query(
    `select public.track_public_lead_site_visit($1, $2, null, null, null, null, false)`,
    [slug, sessionHash(seed)],
  );
}

describe.skipIf(!runPgIntegration)("track_public_lead_site_visit (PostgreSQL)", () => {
  let pool: Pool;

  beforeAll(async () => {
    const pg = await import("pg");
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("executa cenário transacional do arquivo SQL de teste", async () => {
    const sqlPath = path.join(process.cwd(), "supabase/tests/hot_lead_visit_rpc.sql");
    const sql = readFileSync(sqlPath, "utf8");
    const client = await pool.connect();
    try {
      await client.query(sql);
    } finally {
      client.release();
    }
  });

  it("serializa notificação sob visitas concorrentes (2ª e 3ª sessão)", async () => {
    const slug = `t9-concurrent-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    let leadId: string | undefined;

    try {
      const setup = await pool.connect();
      try {
        const seed = await setup.query<{ workspace_id: string; user_id: string }>(
          `select workspace_id::text, user_id::text from public.workspace_members limit 1`,
        );
        if (seed.rowCount === 0) return;

        const { workspace_id, user_id } = seed.rows[0];
        const inserted = await setup.query<{ id: string }>(
          `insert into public.leads (workspace_id, company_name, slug, site_status, status, created_by)
           values ($1::bigint, 'T9 Concurrent', $2, 'published', 'new', $3::uuid)
           returning id::text`,
          [workspace_id, slug, user_id],
        );
        leadId = inserted.rows[0].id;
      } finally {
        setup.release();
      }

      const first = await pool.connect();
      try {
        await trackVisit(first, slug, "visit-1");
      } finally {
        first.release();
      }

      const parallelVisit = async (seed: string) => {
        const client = await pool.connect();
        try {
          await trackVisit(client, slug, seed);
        } finally {
          client.release();
        }
      };

      await Promise.all([parallelVisit("visit-2a"), parallelVisit("visit-2b")]);

      const verify = await pool.connect();
      try {
        const count = await verify.query<{ n: string }>(
          `select count(*)::text as n from public.workspace_notifications
           where lead_id = $1::bigint and kind = 'hot_lead_visit' and metadata ? 'visitCount24h'`,
          [leadId],
        );
        expect(Number(count.rows[0]?.n ?? 0)).toBe(1);
      } finally {
        verify.release();
      }
    } finally {
      if (leadId) {
        const cleanup = await pool.connect();
        try {
          await cleanup.query(`delete from public.leads where id = $1::bigint`, [leadId]);
        } finally {
          cleanup.release();
        }
      }
    }
  });
});

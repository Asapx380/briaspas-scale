/**
 * Cliente Supabase mínimo para medir round-trips e latência simulada (RTT).
 * Cada terminal `.then` / `maybeSingle` / `upload` conta como 1 query.
 */

export type InstrumentedCall = {
  table: string;
  op: "select" | "upload";
  columns?: string;
  startedAt: number;
  endedAt: number;
};

export type InstrumentedStats = {
  queryCount: number;
  totalLatencyMs: number;
  wallMs: number;
  calls: InstrumentedCall[];
  /** Bytes aproximados transferidos no select (payload mock). */
  bytesTransferred: number;
};

type Row = Record<string, unknown>;

export type FixtureDb = {
  leads: Row[];
  whatsapp_conversations: Row[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateRowBytes(row: Row, columns: string) {
  const cols = columns.split(",").map((c) => c.trim());
  let bytes = 24;
  for (const col of cols) {
    const value = row[col];
    if (value == null) bytes += 4;
    else if (typeof value === "string") bytes += value.length * 2;
    else bytes += JSON.stringify(value).length * 2;
  }
  return bytes;
}

export function createInstrumentedClient(
  fixture: FixtureDb,
  options: { rttMs?: number } = {},
) {
  const rttMs = options.rttMs ?? 12;
  const calls: InstrumentedCall[] = [];
  let bytesTransferred = 0;
  const wallStarted = performance.now();

  function track(table: string, op: InstrumentedCall["op"], columns?: string) {
    const startedAt = performance.now();
    return {
      async finish(payloadBytes: number) {
        await sleep(rttMs);
        const endedAt = performance.now();
        bytesTransferred += payloadBytes;
        calls.push({ table, op, columns, startedAt, endedAt });
      },
    };
  }

  function selectBuilder(table: string, columns: string) {
    let eqColumn: string | null = null;
    let eqValue: string | number | null = null;
    let limitCount: number | null = null;
    let ordered = false;

    const runList = async () => {
      const tracker = track(table, "select", columns);
      let rows: Row[] =
        table === "leads"
          ? fixture.leads
          : table === "whatsapp_conversations"
            ? fixture.whatsapp_conversations
            : [];

      if (eqColumn != null) {
        rows = rows.filter((row) => row[eqColumn!] === eqValue || String(row[eqColumn!]) === String(eqValue));
      }
      if (ordered && table === "leads") {
        rows = [...rows].sort(
          (a, b) =>
            new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
        );
      }
      if (limitCount != null) rows = rows.slice(0, limitCount);

      const projected = rows.map((row) => {
        const out: Row = {};
        for (const col of columns.split(",").map((c) => c.trim())) out[col] = row[col] ?? null;
        return out;
      });
      const bytes = projected.reduce((sum, row) => sum + estimateRowBytes(row, columns), 0);
      await tracker.finish(bytes);
      return { data: projected, error: null };
    };

    const builder = {
      select(nextColumns: string) {
        return selectBuilder(table, nextColumns);
      },
      eq(column: string, value: string | number) {
        eqColumn = column;
        eqValue = value;
        return builder;
      },
      order(..._args: unknown[]) {
        void _args;
        ordered = true;
        return builder;
      },
      limit(count: number) {
        limitCount = count;
        return builder;
      },
      async maybeSingle() {
        const result = await runList();
        return { data: result.data[0] ?? null, error: result.error };
      },
      then(
        onfulfilled?: ((value: { data: Row[] | null; error: null }) => unknown) | null,
        onrejected?: ((reason: unknown) => unknown) | null,
      ) {
        return runList().then(onfulfilled, onrejected);
      },
    };

    return builder;
  }

  const client = {
    from(table: string) {
      return {
        select(columns: string) {
          return selectBuilder(table, columns);
        },
      };
    },
    storage: {
      from(bucket: string) {
        void bucket;
        return {
          async upload(path: string, body: unknown, opts?: unknown) {
            void path;
            void body;
            void opts;
            const tracker = track("storage:lead-sites", "upload");
            await tracker.finish(0);
            return { error: null };
          },
        };
      },
    },
    getStats(): InstrumentedStats {
      const wallMs = performance.now() - wallStarted;
      const totalLatencyMs = calls.reduce((sum, call) => sum + (call.endedAt - call.startedAt), 0);
      return {
        queryCount: calls.length,
        totalLatencyMs: Number(totalLatencyMs.toFixed(2)),
        wallMs: Number(wallMs.toFixed(2)),
        calls,
        bytesTransferred,
      };
    },
  };

  return client;
}

/** Gera N leads com payloads representativos (JSON AI + brief ~2–4 KB). */
export function buildRepresentativeLeads(count: number): Row[] {
  const brief = {
    tom: "profissional",
    headline: "Transforme sua presença digital",
    secoes: Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      titulo: `Seção ${i}`,
      texto: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(8),
    })),
  };
  const diagnosis = {
    resumo: "Negócio local com presença irregular online. ".repeat(12),
    dorPrincipal: "Site desatualizado e baixa conversão de visitas.",
    prioridade: "alta",
  };
  const outreach = {
    mensagem: "Olá! Vi o perfil de vocês e preparei uma proposta rápida... ".repeat(10),
    canal: "whatsapp",
  };

  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      id,
      company_name: `Empresa Demo ${id}`,
      phone: `1199${String(1000000 + id).slice(-7)}`,
      email: `contato${id}@demo.local`,
      address: `Rua Exemplo ${id}, Centro`,
      niche: index % 2 === 0 ? "Clínica" : "Restaurante",
      city: index % 3 === 0 ? "São Paulo" : "Campinas",
      status: (["new", "contacted", "hot", "proposal", "won", "lost"] as const)[index % 6],
      notes: "Notas internas longas. ".repeat(20),
      estimated_value: 1500 + index * 10,
      follow_up_at: null,
      website_url: index % 4 === 0 ? null : `https://demo${id}.example`,
      google_maps_url: `https://maps.example/${id}`,
      rating: 3.5 + (index % 15) / 10,
      review_count: 10 + index,
      source: "import",
      slug: `empresa-demo-${id}`,
      visit_count: index % 7,
      site_status: index % 5 === 0 ? "not_generated" : "ready",
      site_source: index % 5 === 0 ? null : "uploaded",
      site_brief: brief,
      ai_diagnosis: diagnosis,
      ai_outreach: outreach,
      created_at: new Date(Date.now() - id * 3600_000).toISOString(),
      updated_at: new Date(Date.now() - id * 1800_000).toISOString(),
    };
  });
}

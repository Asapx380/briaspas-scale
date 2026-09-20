import { describe, expect, it } from "vitest";
import {
  HOT_LEAD_MIN_VISITS_IN_24H,
  HOT_LEAD_VISIT_WINDOW_MS,
  countVisitsInWindow,
  hotLeadNotificationCopy,
  shouldNotifyHotLeadVisit,
} from "./hot-lead-visits";

describe("hot-lead-visits", () => {
  const now = Date.parse("2026-09-20T15:00:00.000Z");

  it("conta apenas visitas dentro da janela de 24h", () => {
    const visits = [
      now - HOT_LEAD_VISIT_WINDOW_MS - 1,
      now - HOT_LEAD_VISIT_WINDOW_MS + 60_000,
      now - 3_600_000,
      now,
    ];
    expect(countVisitsInWindow(visits, now, HOT_LEAD_VISIT_WINDOW_MS)).toBe(3);
  });

  it("não notifica com uma única visita em 24h", () => {
    expect(
      shouldNotifyHotLeadVisit({
        visitsIn24h: 1,
        minVisits: HOT_LEAD_MIN_VISITS_IN_24H,
        alreadyNotifiedToday: false,
      }),
    ).toBe(false);
  });

  it("notifica na segunda visita em 24h", () => {
    expect(
      shouldNotifyHotLeadVisit({
        visitsIn24h: 2,
        minVisits: HOT_LEAD_MIN_VISITS_IN_24H,
        alreadyNotifiedToday: false,
      }),
    ).toBe(true);
  });

  it("não duplica notificação no mesmo dia", () => {
    expect(
      shouldNotifyHotLeadVisit({
        visitsIn24h: 5,
        minVisits: HOT_LEAD_MIN_VISITS_IN_24H,
        alreadyNotifiedToday: true,
      }),
    ).toBe(false);
  });

  it("gera copy com nome e contagem do dia", () => {
    expect(hotLeadNotificationCopy("Padaria Central", 2)).toEqual({
      title: "Lead Padaria Central abriu seu site 2 vezes hoje",
      body: "Priorize o contato — interesse repetido no site demonstrativo nas últimas 24 horas.",
    });
  });
});

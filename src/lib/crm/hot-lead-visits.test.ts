import { describe, expect, it } from "vitest";
import {
  HOT_LEAD_MIN_VISITS_IN_24H,
  HOT_LEAD_NOTIFICATION_TIMEZONE,
  HOT_LEAD_VISIT_WINDOW_MS,
  countVisitsInWindow,
  hotLeadNotificationCopy,
  shouldNotifyHotLeadVisit,
  viewedOnInTimezone,
} from "./hot-lead-visits";

describe("hot-lead-visits", () => {
  const now = Date.parse("2026-09-20T15:00:00.000Z");

  it("deriva viewed_on no fuso America/Sao_Paulo", () => {
    expect(viewedOnInTimezone(Date.parse("2026-09-20T02:30:00.000Z"), HOT_LEAD_NOTIFICATION_TIMEZONE)).toBe(
      "2026-09-19",
    );
    expect(viewedOnInTimezone(Date.parse("2026-09-20T15:00:00.000Z"), HOT_LEAD_NOTIFICATION_TIMEZONE)).toBe(
      "2026-09-20",
    );
  });

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
        isPreview: false,
      }),
    ).toBe(false);
  });

  it("não notifica em prévia mesmo com 2+ visitas", () => {
    expect(
      shouldNotifyHotLeadVisit({
        visitsIn24h: 3,
        minVisits: HOT_LEAD_MIN_VISITS_IN_24H,
        alreadyNotifiedToday: false,
        isPreview: true,
      }),
    ).toBe(false);
  });

  it("notifica na segunda visita publicada em 24h", () => {
    expect(
      shouldNotifyHotLeadVisit({
        visitsIn24h: 2,
        minVisits: HOT_LEAD_MIN_VISITS_IN_24H,
        alreadyNotifiedToday: false,
        isPreview: false,
      }),
    ).toBe(true);
  });

  it("não duplica notificação no mesmo dia", () => {
    expect(
      shouldNotifyHotLeadVisit({
        visitsIn24h: 5,
        minVisits: HOT_LEAD_MIN_VISITS_IN_24H,
        alreadyNotifiedToday: true,
        isPreview: false,
      }),
    ).toBe(false);
  });

  it("gera copy alinhada à janela de 24h", () => {
    expect(hotLeadNotificationCopy("Padaria Central", 2)).toEqual({
      title: "Lead Padaria Central abriu seu site 2 vezes nas últimas 24 horas",
      body: "Priorize o contato — interesse repetido no site demonstrativo nas últimas 24 horas.",
    });
  });
});

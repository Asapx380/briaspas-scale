"use client";

import { useEffect } from "react";

const COOKIE_NAME = "briaspas_visit_session";

function getSessionId() {
  const existing = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  if (existing) return existing;

  const created = crypto.randomUUID();
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${created}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  return created;
}

type VisitTrackerProps = {
  slug: string;
  /** true quando o visitante abre a prévia/demo do site. */
  isPreview?: boolean;
};

export function VisitTracker({ slug, isPreview = false }: VisitTrackerProps) {
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const previewFlag =
      isPreview ||
      query.has("preview") ||
      document.cookie.split("; ").some((item) => item.startsWith("briaspas_preview_"));

    let referrerHost: string | null = null;
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : null;
    } catch {
      referrerHost = null;
    }

    void fetch("/api/v1/site-visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        sessionId: getSessionId(),
        referrerHost,
        utmSource: query.get("utm_source"),
        utmMedium: query.get("utm_medium"),
        utmCampaign: query.get("utm_campaign"),
        isPreview: previewFlag,
      }),
      keepalive: true,
    });
  }, [slug, isPreview]);

  return null;
}

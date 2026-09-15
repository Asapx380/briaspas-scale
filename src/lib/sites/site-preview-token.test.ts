import { describe, expect, it } from "vitest";
import { createSitePreviewToken, hashSitePreviewToken, isValidSitePreviewToken, sitePreviewCookieName } from "./site-preview-token";

describe("site preview tokens", () => {
  it("accepts the matching unexpired token", () => {
    const token = createSitePreviewToken();
    expect(isValidSitePreviewToken(token, hashSitePreviewToken(token), new Date(Date.now() + 60_000).toISOString())).toBe(true);
  });

  it("rejects a different or expired token", () => {
    const token = createSitePreviewToken();
    expect(isValidSitePreviewToken(createSitePreviewToken(), hashSitePreviewToken(token), new Date(Date.now() + 60_000).toISOString())).toBe(false);
    expect(isValidSitePreviewToken(token, hashSitePreviewToken(token), new Date(Date.now() - 1).toISOString())).toBe(false);
  });

  it("creates a stable cookie name without exposing the slug", () => {
    expect(sitePreviewCookieName("minha-empresa")).toMatch(/^briaspas_preview_[0-9a-f]{16}$/);
    expect(sitePreviewCookieName("minha-empresa")).toBe(sitePreviewCookieName("minha-empresa"));
  });
});

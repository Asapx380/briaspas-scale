import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const SITE_PREVIEW_TTL_MS = 30 * 60 * 1000;

export function createSitePreviewToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSitePreviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidSitePreviewToken(token: string, expectedHash: string | null, expiresAt: string | null) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !expectedHash || !/^[0-9a-f]{64}$/.test(expectedHash) || !expiresAt) return false;
  if (new Date(expiresAt).getTime() <= Date.now()) return false;
  return timingSafeEqual(Buffer.from(hashSitePreviewToken(token), "hex"), Buffer.from(expectedHash, "hex"));
}

export function sitePreviewCookieName(slug: string) {
  return `briaspas_preview_${createHash("sha256").update(slug).digest("hex").slice(0, 16)}`;
}

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Google OAuth não configurado.");
  return { clientId, clientSecret, redirectUri };
}

export function encryptRefreshToken(value: string) {
  const encodedKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("Chave de criptografia não configurada.");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const packed = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  return "\\x" + packed.toString("hex");
}

export function decryptRefreshToken(value: string) {
  const encodedKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("Chave de criptografia não configurada.");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("Chave de criptografia inválida.");
  const packed = Buffer.from(value.replace(/^\\x/, ""), "hex");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

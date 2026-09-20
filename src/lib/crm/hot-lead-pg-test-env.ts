/** Integração PostgreSQL opcional — nunca roda no CI sem flag + URL local/staging. */
export function hotLeadPgIntegrationEnabled(): boolean {
  if (process.env.HOT_LEAD_PG_INTEGRATION !== "1") return false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;
  return isLocalOrStagingDatabaseUrl(databaseUrl);
}

export function isLocalOrStagingDatabaseUrl(databaseUrl: string): boolean {
  const lower = databaseUrl.toLowerCase();
  if (lower.includes("localhost") || lower.includes("127.0.0.1")) return true;
  if (lower.includes("staging")) return true;
  if (/:54322\//.test(lower)) return true;
  return false;
}

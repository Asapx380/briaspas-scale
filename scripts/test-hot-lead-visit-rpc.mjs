import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(root, "supabase/tests/hot_lead_visit_rpc.sql");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("test:sql:hot-lead — ignorado (defina DATABASE_URL com migrations T9 aplicadas)");
  process.exit(0);
}

if (!existsSync(sqlPath)) {
  console.error("test:sql:hot-lead — arquivo SQL ausente:", sqlPath);
  process.exit(1);
}

const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  console.error("test:sql:hot-lead — falhou (psql exit %s)", result.status);
  process.exit(result.status ?? 1);
}

console.log("test:sql:hot-lead — ok");

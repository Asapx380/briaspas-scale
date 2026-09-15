import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const clientRoot = join(root, "src");
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const secretNames = /NEXT_PUBLIC_(?:GROQ|FOURSQUARE|GOOGLE|SUPABASE_SERVICE_ROLE|.*(?:SECRET|PRIVATE|API_KEY))/i;
const directSecretUse = /process\.env\.(?:GROQ_API_KEY|FOURSQUARE_PLACES_API_KEY|GOOGLE_PLACES_API_KEY|GOOGLE_MAPS_DEMO_API_KEY|SUPABASE_SERVICE_ROLE_KEY)/;

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return nested.flat();
}

const violations = [];
for (const path of await filesIn(clientRoot)) {
  if (!extensions.has(extname(path))) continue;
  const source = await readFile(path, "utf8");
  const isClientComponent = /^\s*["']use client["'];/m.test(source);
  if (secretNames.test(source) || (isClientComponent && directSecretUse.test(source))) {
    violations.push(relative(root, path));
  }
}

if (violations.length > 0) {
  console.error(`Possível segredo exposto no código cliente:\n${violations.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Auditoria concluída: nenhuma chave privada foi encontrada no código cliente.");
}

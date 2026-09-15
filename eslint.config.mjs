import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Assets tokenizados: os placeholders só viram JavaScript válido após a renderização.
    "src/lib/sites/templates/**/script.js",
    // Artefatos publicados: contêm tokens substituídos antes de serem servidos.
    "src/lib/sites/templates/**/script.js",
  ]),
]);

export default eslintConfig;

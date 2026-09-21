import { loadEnvConfig } from "@next/env";

/** Carrega `.env*` do projeto (inclui `.env.local`) para scripts fora do `next dev`. */
export function loadSampleGenerationEnv(projectDir: string = process.cwd()) {
  loadEnvConfig(projectDir);
}

loadSampleGenerationEnv();

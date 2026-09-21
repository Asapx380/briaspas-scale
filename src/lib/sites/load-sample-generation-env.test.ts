import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEnvConfigMock = vi.fn();

vi.mock("@next/env", () => ({
  loadEnvConfig: (...args: unknown[]) => loadEnvConfigMock(...args),
}));

describe("loadSampleGenerationEnv", () => {
  beforeEach(() => {
    loadEnvConfigMock.mockClear();
  });

  it("delega ao loadEnvConfig do Next com o diretório do projeto", async () => {
    vi.resetModules();
    const { loadSampleGenerationEnv } = await import("./load-sample-generation-env");
    loadEnvConfigMock.mockClear();
    loadSampleGenerationEnv("/caminho/do/projeto");
    expect(loadEnvConfigMock).toHaveBeenCalledTimes(1);
    expect(loadEnvConfigMock).toHaveBeenCalledWith("/caminho/do/projeto");
    expect(loadEnvConfigMock.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("o script de amostras importa o bootstrap antes do gerador", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/generate-site-samples.ts"),
      "utf8",
    );
    const bootstrapImport = source.indexOf(
      'import "../src/lib/sites/load-sample-generation-env"',
    );
    const generatorImport = source.indexOf("site-generator");
    expect(bootstrapImport).toBeGreaterThanOrEqual(0);
    expect(bootstrapImport).toBeLessThan(generatorImport);
  });
});

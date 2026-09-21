import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getOpenRouterConfig, isOpenRouterConfigured } from "./env";

describe("openrouter env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detecta configuração quando OPENROUTER_API_KEY está presente", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key-demo");
    expect(isOpenRouterConfigured()).toBe(true);
    expect(getOpenRouterConfig().model).toBe("openrouter/free");
  });

  it("fica desconfigurada sem OPENROUTER_API_KEY", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    expect(isOpenRouterConfigured()).toBe(false);
    expect(() => getOpenRouterConfig()).toThrow(/OPENROUTER_API_KEY/);
  });

  it("não expõe chave em NEXT_PUBLIC_ nem importa server-only (compatível com tsx/Node)", () => {
    const envSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "env.ts"), "utf8");
    expect(envSource).not.toContain('import "server-only"');
    expect(envSource).not.toMatch(/NEXT_PUBLIC_/);
  });
});

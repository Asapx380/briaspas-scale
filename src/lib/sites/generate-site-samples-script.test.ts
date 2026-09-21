import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const emptyProviderEnv = {
  ...process.env,
  GEMINI_API_KEY: "",
  GROQ_API_KEY: "",
  OPENROUTER_API_KEY: "",
  OPENAI_API_KEY: "",
};

describe("scripts/generate-site-samples.ts", () => {
  it("carrega no Node/tsx sem server-only quando nenhum provedor está configurado", () => {
    const outputRoot = mkdtempSync(join(tmpdir(), "briaspas-samples-"));
    let status: number | null = null;
    let stderr = "";

    try {
      execFileSync(
        "npx",
        [
          "tsx",
          "scripts/generate-site-samples.ts",
          "--out",
          outputRoot,
          "--only",
          "petshop-dados-demonstrativos",
        ],
        {
          cwd: process.cwd(),
          env: emptyProviderEnv,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    } catch (error) {
      const execError = error as NodeJS.ErrnoException & {
        status?: number;
        stderr?: string;
      };
      status = execError.status ?? 1;
      stderr = execError.stderr?.toString() ?? "";
    }

    expect(status).toBe(1);
    expect(stderr).not.toMatch(/server-only|Client Component module/);
    expect(stderr).toMatch(/Nenhum provedor de geração configurado/);

    const summary = JSON.parse(readFileSync(join(outputRoot, "summary.json"), "utf8")) as Array<{
      slug: string;
      failureKind: string;
      error: string;
    }>;
    expect(summary).toHaveLength(1);
    expect(summary[0]?.slug).toBe("petshop-dados-demonstrativos");
    expect(summary[0]?.failureKind).toBe("provider");
    expect(summary[0]?.error).toBe("site_generator_not_configured");
  });
});

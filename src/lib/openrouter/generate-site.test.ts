import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateDesignPlan } from "./generate-site";

describe("openrouter generate-site HTTP 429", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key-demo");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("propaga upstreamStatus e Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "Rate limit exceeded" } },
          { status: 429, headers: { "Retry-After": "42" } },
        ),
      ),
    );

    await expect(generateDesignPlan("briefing")).rejects.toMatchObject({
      name: "OpenRouterRequestError",
      upstreamStatus: 429,
      retryAfterSeconds: 42,
    });
  });
});

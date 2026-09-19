/**
 * Captures fictional demo-site previews for the landing gallery.
 * Does not modify template sources under src/lib/sites/templates.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public/marketing/demo-gallery");

const SLUGS = ["patitas-pet", "forca-ativa", "norte-contabil"];
const BASE_URL = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not ready at ${url}`);
}

await mkdir(outDir, { recursive: true });
await waitForServer(BASE_URL);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const slug of SLUGS) {
  const target = `${BASE_URL}/demonstracao/site-demo/${slug}`;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(target, { waitUntil: "networkidle" });
  await page.locator(".demo-site-root").first().waitFor({ state: "visible" });
  const buffer = await page.locator(".demo-site-root").first().screenshot({ type: "jpeg", quality: 82 });
  const filePath = path.join(outDir, `${slug}.jpg`);
  await writeFile(filePath, buffer);
  console.log(`wrote ${filePath}`);
}

await browser.close();

import { chromium } from "@playwright/test";

const widths = [375, 768, 1280];
const base = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";

const browser = await chromium.launch();
const page = await browser.newPage();

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${base}/#sites-demo`, { waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
  const buttons = page.getByRole("link", { name: "Ver demonstração" });
  const count = await buttons.count();
  let minTarget = true;
  for (let i = 0; i < count; i += 1) {
    const box = await buttons.nth(i).boundingBox();
    if (!box || box.height < 44 || box.width < 44) minTarget = false;
  }
  console.log(JSON.stringify({ width, hScroll: overflow, ctaMin44: minTarget, demoLinks: count }));
  if (overflow || !minTarget) process.exitCode = 1;
}

await browser.close();

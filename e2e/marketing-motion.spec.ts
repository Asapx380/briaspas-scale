import { expect, test } from "@playwright/test";

test("navegação mobile abre, fecha com Escape e alcança as seções", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Abrir navegação" });
  await toggle.click();
  const navigation = page.getByRole("navigation", { name: "Navegação mobile" });
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await navigation.getByRole("link", { name: "Recursos" }).click();
  await expect(page).toHaveURL(/#recursos$/);
  await expect(navigation).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("fundo permite pausa e interrompe animações fora da tela", async ({ page }) => {
  await page.goto("/");
  const background = page.locator(".marketing-background");
  const glow = background.locator(".marketing-background-glow-blue");
  await expect(glow).toHaveCSS("animation-play-state", "running");
  await page.getByRole("button", { name: "Pausar animação de fundo" }).click();
  await expect(glow).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: "Retomar animação de fundo" }).click();
  await expect(glow).toHaveCSS("animation-play-state", "running");
  await page.locator("#seguranca").scrollIntoViewIfNeeded();
  await expect(glow).toHaveCSS("animation-play-state", "paused");
});

test("ativar movimento reduzido revela o conteúdo e desliga o fundo", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#seguranca [data-reveal]").first();
  await expect(section).toHaveAttribute("data-motion-ready", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section).toHaveCSS("opacity", "1");
  await expect(section).toHaveCSS("transform", "none");
  await expect(page.locator(".marketing-background-glow-blue")).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("button", { name: "Pausar animação de fundo" })).toBeHidden();
});

test("sem IntersectionObserver a jornada mantém todos os painéis", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#como-funciona");
  const journey = page.locator("[data-journey-root]");
  await expect(journey).not.toHaveAttribute("data-journey-enhanced");
  const panels = page.locator("[data-journey-panel]");
  await expect(panels).toHaveCount(3);
  for (const panel of await panels.all()) await expect(panel).toHaveCSS("opacity", "1");
  await expect(page.locator(".marketing-background")).toHaveAttribute("data-running", "true");
  expect(errors).toEqual([]);
});

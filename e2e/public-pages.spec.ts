import { expect, test } from "@playwright/test";

import { DEMO_GALLERY_ITEMS } from "../src/lib/marketing/demo-gallery";

function relativeLuminance(color: string) {
  const [red = 0, green = 0, blue = 0] = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
  const channels = [red, green, blue].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

test("galeria sites-demo revela cartões e abre as três prévias", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/#sites-demo");

  const gallery = page.locator("#sites-demo");
  await expect(gallery.getByRole("heading", { name: /Três segmentos/ })).toBeVisible();

  const cards = gallery.locator(".demo-gallery-card[data-reveal]");
  await expect(cards).toHaveCount(3);

  await expect
    .poll(async () => {
      const opacities = await cards.evaluateAll((nodes) =>
        nodes.map((node) => window.getComputedStyle(node).opacity),
      );
      return opacities.every((value) => value === "1");
    })
    .toBe(true);

  for (const [index, item] of DEMO_GALLERY_ITEMS.entries()) {
    await page.goto("/#sites-demo");
    const card = page.locator("#sites-demo .demo-gallery-card").nth(index);
    await card.getByRole("link", { name: "Ver demonstração" }).click();
    await expect(page).toHaveURL(new RegExp(`${item.href.replace(/\//g, "\\/")}$`));
    await expect(page.getByText("Site demonstrativo — dados fictícios")).toBeVisible();
  }
});

test("apresenta o produto e abre a demonstração", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Chegue ao lead com uma proposta concreta." }),
  ).toBeVisible();
  await expect(
    page.locator("section").first().getByText("Dados demonstrativos"),
  ).toBeVisible();

  await page.getByRole("link", { name: "Ver demonstração" }).first().click();
  await expect(page).toHaveURL(/\/demonstracao$/);
  await expect(
    page.getByRole("heading", { name: "Veja como as oportunidades são organizadas." }),
  ).toBeVisible();
  await expect(page.getByText("Os dados abaixo são fictícios")).toBeVisible();
});

test("exibe potencial comercial acessível no kanban mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/preview/crm");

  const indicators = page.locator("[data-commercial-potential]");
  await expect(indicators.first()).toBeVisible();
  await expect(page.getByRole("progressbar", { name: /Potencial comercial/ }).first()).toBeVisible();

  const colors = await page.locator("[data-potential-badge]").evaluateAll((badges) =>
    badges.map((badge) => {
      const styles = window.getComputedStyle(badge);
      return { foreground: styles.color, background: styles.backgroundColor };
    }),
  );
  expect(colors.length).toBeGreaterThan(0);
  for (const color of colors) {
    expect(contrastRatio(color.foreground, color.background)).toBeGreaterThanOrEqual(4.5);
  }

  await page.getByRole("button", { name: "Como este potencial foi calculado" }).first().click();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  const bounds = await tooltip.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
});

test("central do lead organiza ações, abas e objeções", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/preview/crm/1");

  await expect(page.getByRole("heading", { name: "Berg Barbearia" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ligar" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "WhatsApp", exact: true })).toBeVisible();

  const infoTab = page.getByRole("tab", { name: "Informações" });
  await infoTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Notas" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Objeções" }).click();
  await expect(page.getByRole("heading", { name: "Respostas para objeções" })).toBeVisible();
  await expect(page.getByText(/Está caro ou não tenho orçamento agora/)).toBeVisible();
});

test("move um lead pelo puxador sem perder o cartão no kanban", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/preview/crm");

  const handle = page.getByRole("button", { name: "Arrastar Berg Barbearia no funil" });
  const destination = page.getByRole("heading", { name: "Agendado" }).locator("..").locator("..");
  await expect(handle).toBeVisible();
  await expect(destination).toBeVisible();

  const start = await handle.boundingBox();
  const end = await destination.boundingBox();
  expect(start).not.toBeNull();
  expect(end).not.toBeNull();

  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  await page.mouse.move(end!.x + end!.width / 2, end!.y + 130, { steps: 12 });
  await page.mouse.up();

  await expect(destination.getByText("Berg Barbearia", { exact: true })).toBeVisible();
});

test("mantém a jornada visível durante o scroll narrativo", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#como-funciona");

  const journey = page.locator("[data-journey-root]");
  await expect(journey).toBeVisible();
  await expect(journey).not.toHaveAttribute("data-reveal", /.+/);
  await expect(page.getByRole("heading", { name: "Encontre" })).toBeVisible();
  await expect(journey).toHaveCSS("clip-path", "none");
});

test("mini-demo lista leads por nicho e cidade", async ({ page }) => {
  await page.goto("/#mini-demo");

  const miniDemo = page.locator("#mini-demo");
  await expect(miniDemo.getByLabel("Nicho")).toBeVisible();
  await miniDemo.getByLabel("Nicho").selectOption("dentista");
  await miniDemo.getByLabel("Cidade").selectOption("sao-paulo");
  await miniDemo.getByRole("button", { name: "Ver leads de exemplo" }).click();

  await expect(
    page.getByRole("heading", { name: "3 leads demonstrativos de Dentista em São Paulo" }),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Leads de exemplo" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.locator('[aria-live="polite"]')).toHaveText(
    "3 leads de exemplo para Dentista em São Paulo. Dados fictícios.",
  );
  await expect(page.getByText("Odonto Viva São Paulo")).toBeVisible();
  await expect(page.getByText("(11) 9****-1198")).toBeVisible();
});

test("mantém os caminhos principais acessíveis", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Começar grátis" }).first()).toHaveAttribute(
    "href",
    "/cadastro",
  );
  await expect(page.getByRole("link", { name: "Entrar" }).first()).toHaveAttribute(
    "href",
    "/login",
  );

  const privacyResponse = await page.request.get("/privacidade");
  expect(privacyResponse.ok()).toBeTruthy();
});

for (const width of [375, 768, 1280]) {
  test(`mantém o cabeçalho dentro da viewport em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const primaryHeaderCta = page.getByRole("link", { name: "Começar grátis" }).first();
    await expect(primaryHeaderCta).toBeVisible();

    const bounds = await primaryHeaderCta.boundingBox();
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(clientWidth);

    await page.goto("/demonstracao");
    const demoCta = page.getByRole("link", { name: "Criar conta" });
    await expect(demoCta).toBeVisible();
    const demoBounds = await demoCta.boundingBox();
    const demoClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(demoBounds).not.toBeNull();
    expect(demoBounds!.x).toBeGreaterThanOrEqual(0);
    expect(demoBounds!.x + demoBounds!.width).toBeLessThanOrEqual(demoClientWidth);
  });
}

test("usa canonical somente nas rotas que a declaram", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://briaspas-scale.vercel.app",
  );

  await page.goto("/demonstracao");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://briaspas-scale.vercel.app/demonstracao",
  );

  await page.goto("/privacidade");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("alterna e persiste o tema", async ({ page }) => {
  await page.goto("/");
  const root = page.locator("html");
  const initialTheme = await root.getAttribute("data-theme");
  const nextTheme = initialTheme === "dark" ? "light" : "dark";

  await page.getByRole("button", { name: /Ativar modo (claro|escuro)/ }).click();
  await expect(root).toHaveAttribute("data-theme", nextTheme);

  await page.reload();
  await expect(root).toHaveAttribute("data-theme", nextTheme);
});

test("mantém conteúdo visível com movimento reduzido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const title = page.getByRole("heading", { name: "Chegue ao lead com uma proposta concreta." });
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("heading", { name: "O contexto comercial permanece no mesmo lugar." })).toBeVisible();
});

test("expõe o atalho de teclado e mantém o Entrar do login visível no hover", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeFocused();

  await page.goto("/login");
  const submit = page.getByRole("button", { name: "Entrar" });
  await expect(submit).toBeVisible();
  await submit.hover();
  await expect(submit).toBeVisible();
  await expect(submit).not.toHaveCSS("opacity", "0");
});

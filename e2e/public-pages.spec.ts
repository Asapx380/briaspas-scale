import { expect, test } from "@playwright/test";

test("apresenta o produto e abre a demonstração", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Chegue ao lead com uma proposta concreta." }),
  ).toBeVisible();
  await expect(
    page.locator("section").first().getByText("Dados demonstrativos"),
  ).toBeVisible();

  await page.getByRole("link", { name: "Ver demonstração" }).click();
  await expect(page).toHaveURL(/\/demonstracao$/);
  await expect(
    page.getByRole("heading", { name: "Veja como as oportunidades são organizadas." }),
  ).toBeVisible();
  await expect(page.getByText("Os dados abaixo são fictícios")).toBeVisible();
});

test("mini-demo lista leads por nicho e cidade", async ({ page }) => {
  await page.goto("/#mini-demo");

  await page.getByLabel("Nicho").selectOption("dentista");
  await page.getByLabel("Cidade").selectOption("sao-paulo");
  await page.getByRole("button", { name: "Ver leads de exemplo" }).click();

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

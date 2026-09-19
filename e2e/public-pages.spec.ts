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

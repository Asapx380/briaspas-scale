import { expect, test } from "@playwright/test";

test("apresenta o produto e abre a demonstração", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Chegue ao lead com uma proposta concreta." }),
  ).toBeVisible();
  await expect(page.getByText("Dados demonstrativos")).toBeVisible();

  await page.getByRole("link", { name: "Ver demonstração" }).click();
  await expect(page).toHaveURL(/\/demonstracao$/);
  await expect(
    page.getByRole("heading", { name: "Veja como as oportunidades são organizadas." }),
  ).toBeVisible();
  await expect(page.getByText("Os dados abaixo são fictícios")).toBeVisible();
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

import { test, expect } from "@playwright/test";

test.describe("navigazione pubblica", () => {
  test("dalla home si raggiungono le sezioni principali", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: /principale/i }).getByRole("link", { name: "Artisti" }).click();
    await expect(page).toHaveURL(/\/artisti/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("i filtri per disciplina cambiano l'URL restando linkabili", async ({ page }) => {
    await page.goto("/artisti");
    await page.getByRole("link", { name: "DJ", exact: true }).first().click();
    await expect(page).toHaveURL(/disciplina=dj/);
  });

  test("la directory città porta all'elenco locale", async ({ page }) => {
    await page.goto("/citta/milano");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Milano");
    await page.getByRole("link", { name: /tutti gli artisti di milano/i }).click();
    await expect(page).toHaveURL(/\/citta\/milano\/artisti/);
  });

  test("la mappa mostra comunque l'elenco testuale", async ({ page }) => {
    await page.goto("/mappa");
    await expect(page.getByRole("heading", { name: /tutti gli ingaggi sulla mappa/i })).toBeVisible();
  });

  test("la pagina è utilizzabile da tastiera", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    // Il primo elemento focalizzabile deve essere il salto al contenuto
    await expect(page.locator(":focus")).toContainText(/salta al contenuto/i);
  });

  test("il tema scuro si attiva e persiste", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /tema/i }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("l'endpoint di salute risponde", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("database");
  });
});

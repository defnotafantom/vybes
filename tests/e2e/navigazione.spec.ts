import { test, expect } from "@playwright/test";

/**
 * Questi test girano su quattro profili, tre dei quali sono telefoni.
 *
 * Due di loro davano per scontato il layout da computer: la barra orizzontale
 * esiste solo da 768px in su, e sotto la stessa navigazione vive nel menu a
 * scomparsa. Cercarla comunque produceva un'attesa di trenta secondi su un
 * elemento presente nel DOM ma nascosto — un fallimento che sembrava una
 * regressione e non lo era.
 *
 * La copertura non si perde: `percorso-critico.spec.ts` verifica la stessa
 * cosa dal menu, e `mobile.spec.ts` la verifica a 320 e 390 pixel.
 */
const daComputer = (larghezza?: number) => (larghezza ?? 1280) >= 768;

test.describe("navigazione pubblica", () => {
  test("dalla home si raggiungono le sezioni principali", async ({ page, viewport }) => {
    test.skip(!daComputer(viewport?.width), "sotto i 768px la navigazione sta nel menu");

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

  test("la pagina è utilizzabile da tastiera", async ({ page, browserName }) => {
    // Su WebKit il tasto Tab non raggiunge i collegamenti a meno che l'utente
    // non abbia attivato «Usa Tab per evidenziare gli elementi» — è una
    // preferenza di sistema, non un comportamento della pagina. Verificare lì
    // il salto al contenuto misura l'impostazione del browser, non il sito.
    test.skip(browserName === "webkit", "su WebKit il Tab sui link dipende da una preferenza di sistema");

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

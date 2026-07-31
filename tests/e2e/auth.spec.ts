import { test, expect } from "@playwright/test";

test.describe("accesso e registrazione", () => {
  test("la dashboard reindirizza chi non è autenticato", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/accedi/);
    // Il ritorno alla pagina richiesta va conservato
    expect(page.url()).toContain("next=");
  });

  test("credenziali errate mostrano un errore, non una schermata bianca", async ({ page }) => {
    await page.goto("/accedi");
    await page.getByLabel("Email").fill("nessuno@example.com");
    await page.getByLabel("Password").fill("PasswordSbagliata1");
    await page.getByRole("button", { name: /accedi/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test("la registrazione valida la password lato client", async ({ page }) => {
    await page.goto("/registrati");
    await page.getByLabel(/nome/i).fill("Test Utente");
    await page.getByLabel("Email").fill(`test-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("debole");
    await page.getByRole("button", { name: /crea account/i }).click();

    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("si può passare da artista a organizzatore", async ({ page }) => {
    await page.goto("/registrati?ruolo=recruiter");
    await expect(page.getByRole("button", { name: /cerco artisti/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("il recupero password non rivela se l'account esiste", async ({ page }) => {
    await page.goto("/password-dimenticata");
    await page.getByLabel("Email").fill("sicuramente-inesistente@example.com");
    await page.getByRole("button", { name: /invia il link/i }).click();

    await expect(page.getByRole("status")).toContainText(/se esiste un account/i);
  });

  test("un token di verifica non valido non manda in errore la pagina", async ({ page }) => {
    await page.goto("/verifica-email?token=token-inventato-non-valido");
    await expect(page.getByRole("heading")).toContainText(/non valido|scaduto/i);
  });
});

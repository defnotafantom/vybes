import { test, expect } from "./fixtures";

test("la prima scelta del ruolo apre la dashboard senza dover ricaricare la pagina", async ({
  page,
}) => {
  const email = `e2e-onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto("/registrati");
  await page.getByLabel(/nome/i).fill("Prova Onboarding");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("PasswordValida1");
  await page.getByRole("button", { name: /crea account/i }).click();
  await expect(page).toHaveURL(/\/benvenuto$/, { timeout: 25_000 });
  await page.getByRole("radio", { name: /^Cerco artisti/ }).check();
  await expect(page.getByLabel("Il tuo indirizzo")).not.toHaveValue("");
  await page.getByRole("button", { name: "Entra", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: /Ciao Prova Onboarding/ })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Come ti vedono gli artisti", exact: true, includeHidden: true })
  ).toBeAttached();
});

test("dalla scena iniziale si raggiunge l'accesso", async ({ page, browserName, isMobile }) => {
  await page.goto("/");
  // Uno scorrimento reale funziona anche sui profili mobili e non dipende
  // dal focus iniziale della tastiera.
  if (browserName === "webkit" && isMobile) await page.keyboard.press("End");
  else await page.mouse.wheel(0, 5000);
  const link = page.getByRole("link", { name: /ho già un account/i });
  await expect(link).toBeVisible({ timeout: 10_000 });
  await link.click();
  await expect(page).toHaveURL(/\/accedi$/);
});

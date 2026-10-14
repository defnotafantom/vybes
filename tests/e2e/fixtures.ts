import { createHash } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";

// I browser simulano persone distinte senza disattivare il limite dell'app.
export const test = base.extend({
  page: async ({ page, context }, use, info) => {
    const id = createHash("sha256")
      .update(`${info.project.name}:${info.testId}:${info.retry}`)
      .digest("hex")
      .slice(0, 24)
      .match(/.{4}/g)!
      .join(":");
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `2001:db8:${id}` });
    await use(page);
  },
});
export { expect };

export async function completeOnboarding(
  page: Page,
  role: "ARTIST" | "RECRUITER" | "ENTRAMBI" = "ARTIST"
) {
  // La registrazione naviga già qui: attendere evita una seconda
  // navigazione concorrente, soprattutto su WebKit.
  await expect(page).toHaveURL(/\/benvenuto$/, { timeout: 25_000 });
  await expect(page.getByRole("button", { name: "Entra", exact: true })).toBeVisible();
  const choice =
    role === "RECRUITER"
      ? /^Cerco artisti/
      : role === "ENTRAMBI"
        ? /^Tutte e due/
        : /^Sono un artista/;
  await page.getByRole("radio", { name: choice }).check();
  await page.getByRole("button", { name: "Entra", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: /^Ciao / })).toBeVisible();
}

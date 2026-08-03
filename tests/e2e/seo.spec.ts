import { test, expect } from "@playwright/test";

/**
 * Questi test proteggono il lavoro SEO da regressioni silenziose: sono errori
 * che non rompono la build e che ci si accorge di avere solo settimane dopo,
 * guardando Search Console.
 */
test.describe("infrastruttura SEO", () => {
  test("robots.txt permette la scansione e dichiara la sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).toContain("Allow: /");
    expect(body).not.toMatch(/^Disallow: \/$/m);
    expect(body).toContain("Sitemap:");
    // L'area privata non va scansionata
    expect(body).toContain("Disallow: /dashboard/");
  });

  test("la sitemap è un indice valido verso cinque sotto-sitemap", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");

    const body = await res.text();
    expect(body).toContain("<sitemapindex");
    for (const name of ["statiche", "citta", "artisti", "eventi", "portfolio"]) {
      expect(body).toContain(`sitemap-${name}.xml`);
    }
  });

  test("gli URL in sitemap usano il dominio canonico, non quello del deployment", async ({
    request,
    baseURL,
  }) => {
    const body = await (await request.get("/sitemap-statiche.xml")).text();
    expect(body).not.toContain(".vercel.app");
    const host = new URL(baseURL!).host;
    expect(body).toContain(host);
  });

  test("la home ha un solo H1, canonical e dati strutturati", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description?.length).toBeGreaterThan(50);
    expect(description!.length).toBeLessThanOrEqual(160);

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.flatMap((b) => JSON.stringify(JSON.parse(b)).match(/"@type":"[^"]+"/g) ?? []);
    expect(types.join()).toContain("Organization");
    expect(types.join()).toContain("FAQPage");

    // Ogni blocco deve essere JSON valido: uno rotto invalida i rich result.
    for (const block of blocks) expect(() => JSON.parse(block)).not.toThrow();
  });

  test("le pagine di elenco espongono link reali, seguibili dai crawler", async ({ page }) => {
    await page.goto("/citta");
    const links = page.locator('main a[href^="/citta/"]');

    /*
     * `expect(await links.count()).toBeGreaterThan(0)` sembra la stessa cosa e
     * non lo è: `count()` viene risolto **una volta**, prima che `expect`
     * entri in gioco, quindi l'asserzione non ha niente da riprovare. Se la
     * pagina non ha ancora reso l'elenco — su WebKit, con la suite in
     * parallelo, capita — il numero è zero e resta zero.
     *
     * Il fallimento è particolarmente ingannevole: dice «0 link» su una
     * pagina che in quel momento ne ha ventitré, e manda a cercare un difetto
     * di rendering che non esiste.
     *
     * `expect(locator)` invece riprova finché non scade il tempo. La regola:
     * risolvere una promessa **prima** di `expect` disattiva l'attesa
     * automatica di Playwright.
     */
    await expect(links).not.toHaveCount(0);
  });

  test("le pagine private sono escluse dall'indice", async ({ page }) => {
    await page.goto("/accedi");
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");
  });

  test("una pagina inesistente risponde 404", async ({ request }) => {
    expect((await request.get("/artisti/questo-non-esiste-davvero")).status()).toBe(404);
  });

  test("gli URL con slash finale vengono canonicalizzati", async ({ request }) => {
    const res = await request.get("/artisti/", { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    expect(res.headers()["location"]).toContain("/artisti");
  });
});

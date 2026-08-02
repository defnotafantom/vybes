# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seo.spec.ts >> infrastruttura SEO >> una pagina inesistente risponde 404
- Location: tests\e2e\seo.spec.ts:74:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 404
Received: 200
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * Questi test proteggono il lavoro SEO da regressioni silenziose: sono errori
  5  |  * che non rompono la build e che ci si accorge di avere solo settimane dopo,
  6  |  * guardando Search Console.
  7  |  */
  8  | test.describe("infrastruttura SEO", () => {
  9  |   test("robots.txt permette la scansione e dichiara la sitemap", async ({ request }) => {
  10 |     const res = await request.get("/robots.txt");
  11 |     expect(res.status()).toBe(200);
  12 | 
  13 |     const body = await res.text();
  14 |     expect(body).toContain("Allow: /");
  15 |     expect(body).not.toMatch(/^Disallow: \/$/m);
  16 |     expect(body).toContain("Sitemap:");
  17 |     // L'area privata non va scansionata
  18 |     expect(body).toContain("Disallow: /dashboard/");
  19 |   });
  20 | 
  21 |   test("la sitemap è un indice valido verso cinque sotto-sitemap", async ({ request }) => {
  22 |     const res = await request.get("/sitemap.xml");
  23 |     expect(res.status()).toBe(200);
  24 |     expect(res.headers()["content-type"]).toContain("xml");
  25 | 
  26 |     const body = await res.text();
  27 |     expect(body).toContain("<sitemapindex");
  28 |     for (const name of ["statiche", "citta", "artisti", "eventi", "portfolio"]) {
  29 |       expect(body).toContain(`sitemap-${name}.xml`);
  30 |     }
  31 |   });
  32 | 
  33 |   test("gli URL in sitemap usano il dominio canonico, non quello del deployment", async ({
  34 |     request,
  35 |     baseURL,
  36 |   }) => {
  37 |     const body = await (await request.get("/sitemap-statiche.xml")).text();
  38 |     expect(body).not.toContain(".vercel.app");
  39 |     const host = new URL(baseURL!).host;
  40 |     expect(body).toContain(host);
  41 |   });
  42 | 
  43 |   test("la home ha un solo H1, canonical e dati strutturati", async ({ page }) => {
  44 |     await page.goto("/");
  45 | 
  46 |     await expect(page.locator("h1")).toHaveCount(1);
  47 |     await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  48 | 
  49 |     const description = await page.locator('meta[name="description"]').getAttribute("content");
  50 |     expect(description?.length).toBeGreaterThan(50);
  51 |     expect(description!.length).toBeLessThanOrEqual(160);
  52 | 
  53 |     const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  54 |     const types = blocks.flatMap((b) => JSON.stringify(JSON.parse(b)).match(/"@type":"[^"]+"/g) ?? []);
  55 |     expect(types.join()).toContain("Organization");
  56 |     expect(types.join()).toContain("FAQPage");
  57 | 
  58 |     // Ogni blocco deve essere JSON valido: uno rotto invalida i rich result.
  59 |     for (const block of blocks) expect(() => JSON.parse(block)).not.toThrow();
  60 |   });
  61 | 
  62 |   test("le pagine di elenco espongono link reali, seguibili dai crawler", async ({ page }) => {
  63 |     await page.goto("/citta");
  64 |     const links = page.locator('main a[href^="/citta/"]');
  65 |     expect(await links.count()).toBeGreaterThan(0);
  66 |   });
  67 | 
  68 |   test("le pagine private sono escluse dall'indice", async ({ page }) => {
  69 |     await page.goto("/accedi");
  70 |     const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  71 |     expect(robots).toContain("noindex");
  72 |   });
  73 | 
  74 |   test("una pagina inesistente risponde 404", async ({ request }) => {
> 75 |     expect((await request.get("/artisti/questo-non-esiste-davvero")).status()).toBe(404);
     |                                                                                ^ Error: expect(received).toBe(expected) // Object.is equality
  76 |   });
  77 | 
  78 |   test("gli URL con slash finale vengono canonicalizzati", async ({ request }) => {
  79 |     const res = await request.get("/artisti/", { maxRedirects: 0 });
  80 |     expect([301, 308]).toContain(res.status());
  81 |     expect(res.headers()["location"]).toContain("/artisti");
  82 |   });
  83 | });
  84 | 
```
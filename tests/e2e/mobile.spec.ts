import { test, expect, devices } from "@playwright/test";

/**
 * Il sito da un telefono.
 *
 * ── Perché un file a parte ──
 *
 * Il resto della suite gira alla larghezza predefinita di Playwright, 1280px,
 * dove nessuno di questi difetti esiste. Ma il traffico che questo progetto
 * insegue arriva dalla ricerca, e la ricerca arriva soprattutto da telefono:
 * la larghezza a cui il sito funziona meno bene è quella su cui viene visto
 * di più.
 *
 * ── Le due larghezze ──
 *
 * 390px è un iPhone recente, cioè il caso comune. 320px è un iPhone SE di
 * prima generazione, cioè il limite inferiore realistico: è la larghezza a cui
 * le cose si rompono, e testare solo il caso comune significa scoprirle dopo.
 *
 * ── Cosa verificano questi test, e cosa no ──
 *
 * Verificano che si possa **fare qualcosa**: raggiungere le sezioni,
 * accedere, toccare i bersagli, leggere senza trascinare la pagina di lato.
 * Non verificano l'aspetto — quello cambia, e un test che si rompe a ogni
 * ritocco grafico viene disattivato dopo la terza volta.
 */

const TELEFONI = [
  { nome: "iPhone 12 (390px)", viewport: { width: 390, height: 844 } },
  { nome: "iPhone SE (320px)", viewport: { width: 320, height: 568 } },
];

for (const telefono of TELEFONI) {
  test.describe(`${telefono.nome}`, () => {
    test.use({ viewport: telefono.viewport, hasTouch: true, isMobile: true });

    test("«Accedi» si vede senza dover aprire niente", async ({ page }) => {
      // Il difetto: `hidden sm:inline-flex`. Sotto i 640px il pulsante
      // spariva dall'intestazione, e l'unico rimasto — «Iscriviti» — invitava
      // a creare un secondo account chi ne aveva già uno.
      await page.goto("/");

      const accedi = page.getByRole("banner").getByRole("link", { name: /^accedi$/i });
      await expect(accedi).toBeVisible();
      await accedi.click();
      await expect(page).toHaveURL(/\/accedi/);
    });

    test("nessuno scorrimento orizzontale nelle pagine principali", async ({ page }) => {
      // Un solo elemento troppo largo rende scorrevole tutta la pagina, e il
      // sintomo per chi legge è che il sito si sposta di lato mentre scorre.
      for (const percorso of ["/", "/artisti", "/eventi", "/citta", "/cerca"]) {
        await page.goto(percorso);
        const sfora = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(sfora, `${percorso} scorre in orizzontale`).toBe(false);
      }
    });

    test("i bersagli dell'intestazione si toccano senza sbagliare", async ({ page }) => {
      await page.goto("/");

      // 44px è la soglia sotto la quale un dito adulto manca il bersaglio.
      // Tolleranza di un pixel: le altezze calcolate arrivano con decimali.
      for (const nome of [/apri il menu/i, /^accedi$/i]) {
        const el = page.getByRole("banner").getByRole("button", { name: nome }).or(
          page.getByRole("banner").getByRole("link", { name: nome })
        );
        if ((await el.count()) === 0) continue;
        const box = await el.first().boundingBox();
        expect(box!.height, `${nome} è alto ${box!.height}px`).toBeGreaterThanOrEqual(43);
      }
    });

    test("il menu si apre, scorre e porta dove dice", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /apri il menu/i }).click();

      const menu = page.getByRole("dialog", { name: /menu/i });
      await expect(menu).toBeVisible();

      // Su 320×568 il pannello supera l'altezza dello schermo. Senza
      // `overflow-y-auto` — e con il corpo bloccato a `hidden` mentre il menu
      // è aperto — le ultime voci diventavano irraggiungibili: si vedevano
      // ma non si poteva scorrere fino a loro.
      const ultima = menu.getByRole("link", { name: "Cerca", exact: true });
      await ultima.scrollIntoViewIfNeeded();
      await expect(ultima).toBeInViewport();

      await ultima.click();
      await expect(page).toHaveURL(/\/cerca/);
    });

    test("il pannello non esce dallo schermo", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /apri il menu/i }).click();

      const pannello = page.getByRole("dialog", { name: /menu/i }).locator("> div").last();
      const box = await pannello.boundingBox();
      expect(box!.height).toBeLessThanOrEqual(telefono.viewport.height);
    });

    test("il modulo di accesso non fa ingrandire la pagina", async ({ page }) => {
      // Safari su iOS ingrandisce da solo quando riceve il fuoco un campo con
      // testo sotto i 16px, e non torna indietro: ogni modulo del sito faceva
      // saltare l'inquadratura al primo tocco. La verifica è indiretta —
      // Playwright non simula quel comportamento — quindi si controlla la
      // causa: la dimensione calcolata del carattere.
      await page.goto("/accedi");

      const campi = page.locator("input[type=email], input[type=password], input[type=text]");
      const quanti = await campi.count();
      expect(quanti).toBeGreaterThan(0);

      for (let i = 0; i < quanti; i++) {
        const px = await campi.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(px, `campo ${i} a ${px}px: iOS ingrandirebbe`).toBeGreaterThanOrEqual(16);
      }
    });

    test("lo zoom resta possibile", async ({ page }) => {
      // La scorciatoia per non far ingrandire iOS sarebbe `maximum-scale=1`,
      // che risolve il fastidio togliendo lo zoom a chi non ci vede bene.
      // Questo test esiste perché quella scorciatoia non rientri di nascosto.
      await page.goto("/");
      const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
      expect(viewport ?? "").not.toMatch(/maximum-scale\s*=\s*1|user-scalable\s*=\s*no/);
    });
  });
}

test.describe("area personale da telefono", () => {
  test.use({ ...devices["iPhone 12"] });

  test("senza sessione si finisce al login, non su una pagina rotta", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/accedi/);
    // E il modulo dev'essere utilizzabile subito, senza scorrere di lato.
    await expect(page.getByRole("heading", { name: /accedi/i })).toBeVisible();
    const sfora = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(sfora).toBe(false);
  });
});

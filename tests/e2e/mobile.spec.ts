import { test, expect } from "@playwright/test";

/**
 * Il sito da un telefono.
 *
 * ── Perché un file a parte ──
 *
 * Il traffico che questo progetto insegue arriva dalla ricerca, e la ricerca
 * arriva soprattutto da telefono: la larghezza a cui il sito funziona meno
 * bene era quella da cui viene visto di più. Cinque difetti stavano lì, e
 * nessuno era visibile a 1280px.
 *
 * ── Le larghezze non sono scritte qui ──
 *
 * Vengono dai progetti in `playwright.config.ts` — `android`, `iphone`,
 * `iphone-se` — così ogni prova gira su ogni motore senza che questo file
 * sappia niente di telefoni. Ripetere qui un elenco di dispositivi
 * significherebbe tenerne due allineati, e scoprire alla terza modifica che
 * non lo sono più.
 *
 * Sul progetto desktop questi test si saltano da soli: verificano un
 * comportamento che a 1280px non esiste, e farli fallire lì darebbe un
 * allarme su qualcosa che non è rotto.
 *
 * ── Cosa verificano, e cosa no ──
 *
 * Che si possa **fare qualcosa**: raggiungere le sezioni, accedere, toccare i
 * bersagli, leggere senza trascinare la pagina di lato. Non l'aspetto: un
 * test che si rompe a ogni ritocco grafico viene disattivato dopo la terza
 * volta, e da quel momento non protegge più niente.
 */

test.beforeEach(({ viewport }) => {
  test.skip((viewport?.width ?? 1280) > 640, "prova valida solo da telefono");
});

test("«Accedi» si vede senza dover aprire niente", async ({ page }) => {
  // Il difetto: `hidden sm:inline-flex`. Sotto i 640px il pulsante spariva
  // dall'intestazione, e l'unico rimasto — «Iscriviti» — invitava a creare un
  // secondo account chi ne aveva già uno.
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
  const barra = page.getByRole("banner");

  // 44px è la soglia sotto la quale un dito adulto manca il bersaglio.
  // Tolleranza di un pixel: le altezze calcolate arrivano con decimali.
  const bersagli = [
    barra.getByRole("button", { name: /apri il menu/i }),
    barra.getByRole("link", { name: /^accedi$/i }),
  ];

  for (const b of bersagli) {
    if ((await b.count()) === 0) continue;
    const box = await b.first().boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(43);
  }
});

test("il menu si apre, scorre e porta dove dice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /apri il menu/i }).click();

  const menu = page.getByRole("dialog", { name: /menu/i });
  await expect(menu).toBeVisible();

  // Su 320×568 il pannello supera l'altezza dello schermo. Senza
  // `overflow-y-auto` — e con il corpo bloccato a `hidden` mentre il menu è
  // aperto — le ultime voci diventavano irraggiungibili: si vedevano ma non
  // si poteva scorrere fino a loro.
  const ultima = menu.getByRole("link", { name: "Cerca", exact: true });
  await ultima.scrollIntoViewIfNeeded();
  await expect(ultima).toBeInViewport();

  await ultima.click();
  await expect(page).toHaveURL(/\/cerca/);
});

test("il pannello non esce dallo schermo", async ({ page, viewport }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /apri il menu/i }).click();

  const pannello = page.getByRole("dialog", { name: /menu/i }).locator("> div").last();
  const box = await pannello.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(viewport!.height);
});

test("i moduli non fanno ingrandire la pagina", async ({ page }) => {
  // Safari su iOS ingrandisce da solo quando riceve il fuoco un campo con
  // testo sotto i 16px, e non torna indietro: ogni modulo del sito faceva
  // saltare l'inquadratura al primo tocco. La verifica è indiretta —
  // Playwright non simula quel comportamento nemmeno su WebKit — quindi si
  // controlla la causa: la dimensione calcolata del carattere.
  for (const percorso of ["/accedi", "/registrati", "/cerca"]) {
    await page.goto(percorso);

    const campi = page.locator("input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]), textarea, select");
    const quanti = await campi.count();

    for (let i = 0; i < quanti; i++) {
      const px = await campi.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(px, `${percorso}, campo ${i} a ${px}px: iOS ingrandirebbe`).toBeGreaterThanOrEqual(16);
    }
  }
});

test("lo zoom resta possibile", async ({ page }) => {
  // La scorciatoia per non far ingrandire iOS sarebbe `maximum-scale=1`, che
  // risolve il fastidio togliendo lo zoom a chi non ci vede bene (criterio
  // WCAG 1.4.4). Questo test esiste perché quella riga non rientri di
  // nascosto fra sei mesi, quando qualcuno vorrà chiudere in fretta lo stesso
  // problema.
  await page.goto("/");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport ?? "").not.toMatch(/maximum-scale\s*=\s*1|user-scalable\s*=\s*no/);
});

test("senza sessione la dashboard porta al login, non a una pagina rotta", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/accedi/);
  await expect(page.getByRole("heading", { name: /accedi/i })).toBeVisible();

  const sfora = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(sfora).toBe(false);
});

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

/**
 * ── L'area personale da telefono ──
 *
 * Le prove qui sopra si fermano tutte alla porta: verificano che senza
 * sessione si finisca al login. Ma è **dentro** che un artista passa il
 * tempo — compila il profilo, carica i lavori, risponde a una candidatura —
 * e quella metà del sito non è mai stata percorsa da uno schermo stretto.
 *
 * Nessuna di queste prove verifica l'aspetto. Verificano che si possa fare
 * qualcosa: raggiungere le sezioni, leggere senza trascinare la pagina di
 * lato, toccare le caselle senza mancarle.
 *
 * L'account viene creato al momento e non riutilizzato: i profili del browser
 * girano in parallelo, e due prove che si passano lo stesso utente falliscono
 * a giorni alterni per motivi che non c'entrano con quello che verificano.
 * Servono `E2E_DATABASE_URL` e lo script `pulisci:e2e` — vedi ORDINE.md.
 */
test.describe("dentro l'area personale", () => {
  /** Entra, oppure salta: senza sessione non c'è niente da verificare qui. */
  async function entra(page: import("@playwright/test").Page) {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

    await page.goto("/registrati");
    await page.getByLabel(/nome/i).fill("Prova Telefono");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("PasswordValida1");
    await page.getByRole("button", { name: /crea account/i }).click();

    await page.waitForURL(/\/dashboard|\/registrati|\/accedi/, { timeout: 20_000 }).catch(() => {});
    test.skip(
      !/\/dashboard/.test(page.url()),
      "verifica dell'email attiva: l'accesso automatico non avviene"
    );
  }

  test("ogni sezione si raggiunge dal menu, e nessuna scorre di lato", async ({ page }) => {
    await entra(page);

    // Il menu laterale a colonna è nascosto sotto i 1024px: da telefono
    // l'unica via è il pannello, e se non si apre l'area personale è un
    // vicolo cieco con dentro tutto il lavoro di chi si è iscritto.
    for (const [voce, percorso] of [
      ["Profilo", "/dashboard/profilo"],
      ["Portfolio", "/dashboard/portfolio"],
      ["Ingaggi", "/dashboard/eventi"],
      ["Quest", "/dashboard/quest"],
    ] as const) {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: /apri il menu delle sezioni/i }).click();

      const pannello = page.getByRole("dialog", { name: /menu/i });
      const link = pannello.getByRole("link", { name: voce, exact: true });
      await link.scrollIntoViewIfNeeded();
      await link.click();

      await expect(page).toHaveURL(new RegExp(percorso.replace(/\//g, "\\/")));

      const sfora = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(sfora, `${percorso} scorre in orizzontale`).toBe(false);
    }
  });

  test("i campi dell'area personale non fanno ingrandire la pagina", async ({ page }) => {
    // Stesso difetto di iOS delle pagine pubbliche, su moduli molto più
    // lunghi: qui l'inquadratura salta a metà compilazione, non all'inizio.
    await entra(page);

    for (const percorso of ["/dashboard/profilo", "/dashboard/eventi/nuovo"]) {
      await page.goto(percorso);
      const campi = page.locator(
        "input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]), textarea, select"
      );
      const quanti = await campi.count();
      for (let i = 0; i < quanti; i++) {
        const px = await campi.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(px, `${percorso}, campo ${i} a ${px}px: iOS ingrandirebbe`).toBeGreaterThanOrEqual(16);
      }
    }
  });

  test("le caselle di spunta si toccano senza mancarle", async ({ page }) => {
    // Governano cose che non si vogliono sbagliare con un dito: sparire dalla
    // directory pubblica, dichiarare un ingaggio retribuito. Quelle native
    // sono alte tredici pixel, cioè metà del bersaglio minimo.
    await entra(page);
    await page.goto("/dashboard/profilo");

    const casella = page.locator('input[type=checkbox]').first();
    await casella.scrollIntoViewIfNeeded();
    const box = await casella.boundingBox();
    expect(box!.height, "casella troppo piccola per un dito").toBeGreaterThanOrEqual(19);

    // L'area cliccabile vera è l'etichetta che la contiene, che deve arrivare
    // ai 44px: ingrandire la casella oltre i 20px la renderebbe sproporzionata.
    const etichetta = page.locator("label").filter({ has: casella });
    const boxEtichetta = await etichetta.boundingBox();
    expect(boxEtichetta!.height).toBeGreaterThanOrEqual(43);
  });

  test("un annuncio con data passata non si pubblica", async ({ page }) => {
    // Il difetto: si pubblicava, l'API rispondeva 201, e l'annuncio non
    // compariva in nessun elenco perché tutte le directory filtrano per
    // `startsAt >= adesso`. Un successo che non è successo.
    await entra(page);
    await page.goto("/dashboard/eventi/nuovo");

    await page.getByLabel("Titolo").fill("Prova con data passata");
    await page
      .getByLabel("Descrizione")
      .fill("Descrizione sufficientemente lunga per superare il minimo richiesto dal modulo.");
    await page.getByLabel("Inizio").fill("2020-01-01T20:00");
    await page.getByLabel("Città").selectOption({ index: 1 });

    await page.getByRole("button", { name: /pubblica ingaggio/i }).click();

    // Deve restare qui e dirlo, non festeggiare e sparire.
    await expect(page.getByRole("alert").filter({ hasText: /data è già passata/i })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/eventi\/nuovo/);
  });
});

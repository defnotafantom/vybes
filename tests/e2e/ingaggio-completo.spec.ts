import { test, expect, type Page, type Browser } from "@playwright/test";

/**
 * Il percorso per cui il sito esiste, dall'inizio alla fine.
 *
 * ── Perché mancava, ed è la lacuna più grave della suite ──
 *
 * `percorso-critico.spec.ts` copre tutto ciò che sta **attorno** a questo
 * flusso: che dopo il login si torni all'ingaggio giusto, che la
 * registrazione finisca da qualche parte, che un `next` malevolo non porti
 * fuori dal sito. Non copre il flusso.
 *
 * Eppure è l'unica cosa che il prodotto promette: un organizzatore pubblica,
 * un artista si candida, l'organizzatore sceglie, e da lì in avanti si
 * mettono d'accordo. Se si rompe un anello di questa catena il sito continua
 * a rispondere 200 su ogni pagina, i test continuano a passare, e il prodotto
 * semplicemente **non fa la cosa per cui esiste** — che è esattamente la
 * categoria di difetto che su questo progetto si è già presentata tre volte:
 * l'ingaggio pubblicato e invisibile, la cache rigenerata sull'indirizzo
 * sbagliato, la registrazione che finiva sul login.
 *
 * ── Perché due contesti e non due login alternati ──
 *
 * Perché è una conversazione fra due persone, e metà dei difetti possibili
 * stanno nel passaggio: quello che uno fa deve comparire dall'altra parte.
 * Con una sessione sola che si sloga e si rilogga non si distingue «l'altro
 * lo vede» da «lo vedo io perché l'ho appena scritto».
 *
 * ── Costo, e dove gira ──
 *
 * Due account veri per esecuzione, più un ingaggio. Come tutto il resto della
 * suite, richiede `E2E_DATABASE_URL`: `verifica-db-test.mjs` non lascia
 * partire niente senza. `npm run pulisci:e2e` li rimuove.
 */

const emailUnica = (chi: string) =>
  `e2e-${Date.now()}-${chi}${Math.random().toString(36).slice(2, 6)}@example.com`;

const PASSWORD = "PasswordValida1";

/**
 * Registra e apre la sessione, oppure salta la prova.
 *
 * Con la verifica dell'email attiva l'accesso automatico non avviene, e non
 * c'è modo di leggere la posta da qui: la prova non ha nulla da verificare e
 * va **saltata**, non fatta fallire. Un test rosso per un motivo diverso da
 * quello che gli interessa viene disattivato dopo la seconda volta, e da quel
 * momento non protegge più niente.
 */
async function entra(page: Page, nome: string): Promise<string> {
  const email = emailUnica(nome.toLowerCase().replace(/\W/g, ""));

  await page.goto("/registrati");
  await page.getByLabel(/nome/i).fill(nome);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /crea account/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 25_000 }).catch(() => {});
  test.skip(
    !/\/dashboard/.test(page.url()),
    "verifica dell'email attiva: l'accesso automatico non avviene, il flusso non è percorribile da qui"
  );

  return email;
}

/** Fra due settimane, nel formato che `datetime-local` accetta. */
function fraDueSettimane(): string {
  const d = new Date(Date.now() + 14 * 86_400_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

async function nuovoContesto(browser: Browser) {
  const context = await browser.newContext();
  return { context, page: await context.newPage() };
}

test("un ingaggio arriva fino all'accordo: pubblico, mi candido, mi accettano, ci parliamo", async ({
  browser,
}) => {
  // Quattro passaggi con due sessioni: il tempo predefinito non basta, e
  // alzarlo qui è meglio che spezzare il flusso in prove che non si
  // raccontano niente a vicenda.
  test.setTimeout(180_000);

  const titolo = `Prova flusso ${Date.now()}`;
  const messaggioCandidatura = "Suono da otto anni, ho un repertorio pronto per questa data.";
  const messaggioAccordo = "Ciao, confermiamo l'orario: arrivo per il soundcheck alle 19.";

  const org = await nuovoContesto(browser);
  const art = await nuovoContesto(browser);

  try {
    // ── 1. L'organizzatore pubblica ────────────────────────────────────────
    await entra(org.page, "Prova Organizzatore");

    await org.page.goto("/dashboard/eventi/nuovo");
    await org.page.getByLabel("Titolo").fill(titolo);
    await org.page
      .getByLabel("Descrizione")
      .fill(
        "Cerchiamo un musicista per un set acustico di due ore. Service audio incluso, backline disponibile in sala."
      );
    await org.page.getByLabel("Inizio").fill(fraDueSettimane());

    // La prima città vera dell'elenco: `index: 0` è il segnaposto «Seleziona…»,
    // che lo schema rifiuta.
    await org.page.getByLabel("Città").selectOption({ index: 1 });

    await org.page.getByRole("button", { name: /pubblica ingaggio/i }).click();

    /*
     * Si finisce sulla pagina pubblica dell'ingaggio: è la conferma che è
     * stato creato **e** che è raggiungibile, che sono due cose diverse.
     *
     * ── Com'era scritta male, la prima volta ──
     *
     * `waitForURL(/\/eventi\/[^/]+$/)`. Sembra ragionevole e non lo è: il
     * modulo di pubblicazione **sta** su `/dashboard/eventi/nuovo`, che
     * quell'espressione soddisfa già. L'attesa tornava subito, `urlIngaggio`
     * restava l'indirizzo del modulo, e l'artista due passi dopo apriva la
     * pagina di creazione invece dell'annuncio — fallendo con «heading non
     * trovato», cioè dando la colpa al posto sbagliato.
     *
     * È lo stesso errore già registrato in `percorso-critico.spec.ts`:
     * verificare la forma di un indirizzo invece di *dove si è finiti*. Qui
     * si esclude esplicitamente l'area personale, che è l'unica cosa che
     * distingue le due pagine.
     */
    await org.page.waitForURL(
      (u) => /^\/eventi\/[^/]+$/.test(new URL(u).pathname),
      { timeout: 30_000 }
    );
    const urlIngaggio = org.page.url();
    await expect(org.page.getByRole("heading", { name: titolo })).toBeVisible();

    // ── 2. L'artista lo trova e si candida ─────────────────────────────────
    await entra(art.page, "Prova Artista");

    await art.page.goto(urlIngaggio);
    // Che l'annuncio sia visibile a **un'altra persona** è metà del punto:
    // pubblicare qualcosa che vede solo chi l'ha scritto è già capitato.
    await expect(art.page.getByRole("heading", { name: titolo })).toBeVisible();

    await art.page.getByRole("button", { name: /^candidati$/i }).click();
    await art.page.getByLabel(/messaggio per l'organizzatore/i).fill(messaggioCandidatura);
    await art.page.getByRole("button", { name: /invia candidatura/i }).click();

    // Il pulsante cambia stato: è il riscontro immediato che l'invio è
    // andato. Senza, chi si candida non sa se ha cliccato davvero.
    await expect(
      art.page.getByRole("button", { name: /ritira la candidatura/i })
    ).toBeVisible({ timeout: 20_000 });

    // ── 3. L'organizzatore la vede e accetta ───────────────────────────────
    await org.page.goto("/dashboard/eventi");

    // Si passa dalla riga dell'ingaggio invece di costruire l'URL a mano:
    // così la prova verifica anche che quell'annuncio compaia fra i propri e
    // che «Gestisci» porti dove dice.
    const riga = org.page.locator("li").filter({ hasText: titolo });
    await expect(riga, "l'ingaggio appena pubblicato non compare fra i tuoi").toBeVisible();
    await riga.getByRole("link", { name: /gestisci|vedi/i }).click();

    await expect(
      org.page.getByText(messaggioCandidatura),
      "il messaggio della candidatura non è arrivato all'organizzatore"
    ).toBeVisible({ timeout: 20_000 });

    await org.page.getByRole("button", { name: /^accetta$/i }).click();

    // Dopo la decisione compare il modo di scrivere alla persona accettata:
    // è il punto in cui il prodotto smette di servire a trovarsi e comincia a
    // servire a mettersi d'accordo, ed è dove il flusso si fermava.
    const scrivi = org.page.getByRole("link", { name: /scrivi a /i });
    await expect(scrivi, "accettato qualcuno, non c'è modo di scrivergli").toBeVisible({
      timeout: 20_000,
    });

    // ── 4. L'artista vede l'esito ──────────────────────────────────────────
    await art.page.goto("/dashboard/eventi");
    await expect(
      art.page.locator("li").filter({ hasText: titolo }).getByText(/accettat/i),
      "l'artista non vede di essere stato accettato"
    ).toBeVisible({ timeout: 20_000 });

    // ── 5. Si parlano ──────────────────────────────────────────────────────
    await scrivi.click();
    await org.page.waitForURL(/\/dashboard\/messaggi/, { timeout: 20_000 });

    await org.page.getByRole("textbox").last().fill(messaggioAccordo);
    await org.page.getByRole("button", { name: /invia/i }).click();

    await expect(org.page.getByText(messaggioAccordo)).toBeVisible({ timeout: 20_000 });

    // E soprattutto: lo vede l'altro. È l'unica asserzione che distingue «il
    // messaggio è stato scritto» da «il messaggio è arrivato».
    await art.page.goto("/dashboard/messaggi");
    await art.page.getByRole("link").filter({ hasText: /prova organizzatore/i }).first().click();
    await expect(
      art.page.getByText(messaggioAccordo),
      "il messaggio non è arrivato dall'altra parte"
    ).toBeVisible({ timeout: 20_000 });
  } finally {
    await org.context.close();
    await art.context.close();
  }
});

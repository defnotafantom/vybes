import { test, expect } from "@playwright/test";

/**
 * Il percorso per cui il sito esiste.
 *
 * Questi test nascono da cinque difetti trovati tutti insieme, tutti sulla
 * stessa strada, e tutti passati inosservati per settimane. Non erano difetti
 * sottili: rendevano il sito inutilizzabile per chi arrivava la prima volta.
 * La suite copriva autenticazione, navigazione e SEO — cioè le parti che si
 * scrivono per prime — e non copriva il percorso che dà senso a tutto: arrivo
 * da una ricerca, mi iscrivo, mi candido, vengo accettato, ci parliamo.
 *
 * Un test che si limita a controllare che una pagina risponda 200 non vede
 * nessuno di quei problemi. Le pagine rispondevano tutte.
 *
 * Da qui la regola che governa questo file: ogni test verifica **dove si
 * finisce**, non che qualcosa esista. Perdere la destinazione è stato il
 * difetto che si è ripetuto due volte, su entrambe le metà dell'imbuto, ed è
 * invisibile a chi guarda le singole pagine invece dei passaggi fra loro.
 */

/** Indirizzo irripetibile: i test girano in parallelo e più volte al giorno. */
const emailUnica = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test.describe("ritorno alla destinazione dopo il login", () => {
  test("chi clicca «Contatta» senza essere autenticato non perde l'artista", async ({ page }) => {
    // Il difetto: il middleware passava al login solo il percorso e non la
    // query. Dopo l'accesso si tornava su /dashboard/messaggi/nuovo senza più
    // sapere chi contattare, e si finiva nell'elenco vuoto dei messaggi.
    await page.goto("/dashboard/messaggi/nuovo?a=un-artista");

    await expect(page).toHaveURL(/\/accedi/);

    const next = new URL(page.url()).searchParams.get("next");
    expect(next, "il parametro next deve esserci").toBeTruthy();
    expect(next, "la query va conservata, non solo il percorso").toContain("a=un-artista");
  });

  test("la destinazione conserva la query anche con più parametri", async ({ page }) => {
    await page.goto("/dashboard/eventi?stato=aperti&pagina=2");

    const next = new URL(page.url()).searchParams.get("next");
    expect(next).toContain("stato=aperti");
    expect(next).toContain("pagina=2");
  });

  test("«Accedi per candidarti» riporta a quell'ingaggio, non all'elenco", async ({ page }) => {
    // Serve un ingaggio vero: se non ce ne sono, il test non ha nulla da
    // verificare e va saltato invece di fallire per un motivo diverso da
    // quello che gli interessa.
    await page.goto("/eventi");
    const primo = page.locator('a[href^="/eventi/"]').first();
    test.skip((await primo.count()) === 0, "nessun ingaggio pubblicato");

    const href = await primo.getAttribute("href");
    await page.goto(href!);

    const accedi = page.getByRole("link", { name: /accedi per candidarti/i });
    test.skip((await accedi.count()) === 0, "ingaggio non aperto alle candidature");

    await accedi.click();
    await expect(page).toHaveURL(/\/accedi/);

    const next = new URL(page.url()).searchParams.get("next");
    expect(next, "deve riportare all'ingaggio letto, non a /eventi").toBe(href);
  });
});

test.describe("la destinazione non può portare fuori dal sito", () => {
  // Il parametro `next` viene dall'URL, quindi da chiunque. Passato così com'è
  // a un reindirizzamento diventa un'esca per il phishing: la vittima vede il
  // dominio giusto, si fida, e dopo il login finisce su un clone.
  const esche = [
    "https://vybes-fake.example",
    "//vybes-fake.example",
    "/\\vybes-fake.example",
    "/javascript:alert(1)",
  ];

  /**
   * ── Come questo test era sbagliato ──
   *
   * Le prime due asserzioni non verificavano niente.
   *
   *   expect(new URL(page.url()).host).toBe(new URL(page.url()).host);
   *
   * confronta un valore con sé stesso: passa sempre, anche a difesa
   * completamente rotta. Ed è passata inosservata perché una riga verde non si
   * rilegge.
   *
   *   expect(page.url()).not.toContain("vybes-fake.example");
   *
   * falliva sempre, per il motivo opposto: il parametro `next` sta nell'URL
   * perché ce l'abbiamo messo noi due righe sopra. Stava chiedendo alla pagina
   * di cancellare il proprio indirizzo.
   *
   * Il difetto comune è di aver verificato **l'indirizzo scritto nella barra**
   * invece di *dove si finisce davvero*, che è esattamente l'errore che questo
   * file, in cima, dichiara di non voler più fare.
   *
   * ── Cosa verifica adesso ──
   *
   * Che il browser resti sul nostro dominio, che l'esca non diventi la
   * destinazione di nessun collegamento della pagina, e che il modulo non la
   * porti con sé come campo nascosto. La regola in sé — quali valori sono
   * accettabili — è coperta dai test unitari di `destinazione.ts`, dove si può
   * esercitare ogni caso limite senza un browser.
   */
  for (const esca of esche) {
    test(`«${esca}» non diventa la destinazione`, async ({ page }) => {
      await page.goto(`/accedi?next=${encodeURIComponent(esca)}`);

      // La pagina deve caricarsi normalmente: la difesa è ignorare il valore,
      // non rompersi. Un errore sarebbe comunque un difetto.
      await expect(page.getByRole("heading", { name: /accedi/i })).toBeVisible();

      // Siamo rimasti sul nostro dominio, non su quello dell'esca.
      const atteso = new URL(page.url()).host;
      expect(atteso).toBe(new URL(test.info().project.use.baseURL!).host);

      // E nessun collegamento della pagina punta all'esca: se la destinazione
      // finisse in un `href`, basterebbe un clic per uscire.
      const fuori = await page
        .locator('a[href*="vybes-fake.example"], form[action*="vybes-fake.example"]')
        .count();
      expect(fuori, "l'esca è finita in un link o in un modulo").toBe(0);

      // Né in un campo nascosto, che il modulo invierebbe al posto nostro.
      const nascosti = await page
        .locator('input[type=hidden][value*="vybes-fake.example"]')
        .count();
      expect(nascosti, "l'esca è finita in un campo nascosto").toBe(0);
    });
  }
});

test.describe("la registrazione finisce da qualche parte", () => {
  test("dopo l'iscrizione si vede cosa fare, non un modulo di accesso", async ({ page }) => {
    /*
     * ── Perché il limite di questo test è alzato ──
     *
     * L'attesa qui sotto è a quarantacinque secondi, e il limite predefinito
     * di Playwright è trenta: portando su la prima senza toccare il secondo
     * il test moriva **prima** di poter concludere, e al posto di una
     * diagnosi — «la registrazione non è finita da nessuna parte» — usciva un
     * nudo «Test timeout of 30000ms exceeded», che non dice niente.
     *
     * La regola generale: una scadenza dentro un test deve stare sotto la
     * scadenza del test, altrimenti il ramo che spiega l'errore non viene mai
     * eseguito. Un test che scade prima di formulare la propria conclusione
     * segnala che qualcosa è rotto e non dice cosa.
     */
    test.setTimeout(75_000);

    // Il difetto peggiore di tutti: in produzione la verifica dell'email è
    // richiesta, quindi l'accesso automatico non poteva riuscire. Il
    // fallimento non veniva guardato, si proseguiva verso la dashboard, il
    // middleware non trovava il cookie e rimandava al login. Chi si era appena
    // iscritto si ritrovava davanti a un modulo di accesso, senza una parola.
    const email = emailUnica();

    await page.goto("/registrati");
    await page.getByLabel(/nome/i).fill("Prova Percorso");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("PasswordValida1");
    await page.getByRole("button", { name: /crea account/i }).click();

    // Due finali leciti, a seconda che le email siano configurate:
    //  · con verifica → la schermata «controlla la posta»;
    //  · senza verifica → si entra davvero.
    // Quello che NON deve succedere è restare sulla pagina di registrazione o
    // essere sbattuti sul login.
    // ── Come questa attesa era scritta male ──
    //
    // Diceva `.not.toBe("rimbalzato-al-login")`, quindi passava anche quando
    // l'esito era «fermo»: cioè quando la registrazione *non era finita da
    // nessuna parte*, che è precisamente il difetto che questo test esiste per
    // cogliere. Subito dopo, l'esito veniva dedotto con un ternario che
    // considerava «verifica» tutto ciò che non era la dashboard — e il test
    // falliva cercando un indirizzo email su una pagina di registrazione
    // ancora aperta, dando la colpa alla schermata sbagliata.
    //
    // Ora si aspetta un esito **valido**, non l'assenza di quello cattivo. La
    // differenza si vede quando qualcosa va storto: prima il messaggio parlava
    // di un testo mancante, adesso dice che la registrazione non è arrivata da
    // nessuna parte.
    const esito = await new Promise<string>((risolvi) => {
      // Quarantacinque secondi e non venti: sotto WebKit, con la suite in
      // parallelo, la registrazione superava il limite e l'esito usciva
      // «fermo» — cioè il test accusava il difetto che esiste per cogliere,
      // ma per lentezza. Un rosso che non corrisponde a niente è peggio di
      // nessun test: insegna a ignorare il rosso. Qui si verifica *dove si
      // finisce*, non in quanto tempo.
      const scadenza = Date.now() + 45_000;
      const guarda = async () => {
        const url = page.url();
        if (/\/dashboard/.test(url)) return risolvi("dentro");
        if (await page.getByText(/conferma l'email|controlla/i).first().isVisible().catch(() => false))
          return risolvi("verifica");
        if (/\/accedi/.test(url)) return risolvi("rimbalzato-al-login");
        if (Date.now() > scadenza) return risolvi("fermo");
        setTimeout(guarda, 250);
      };
      void guarda();
    });

    expect(
      esito,
      esito === "fermo"
        ? "la registrazione non è finita da nessuna parte: né dashboard né schermata di verifica"
        : "chi si è appena iscritto è stato rimandato al modulo di accesso"
    ).toMatch(/^(dentro|verifica)$/);

    if (esito === "verifica") {
      // L'indirizzo va ripetuto: chi non lo vede scritto non sa dove guardare,
      // e il messaggio finisce quasi sempre nello spam.
      await expect(page.getByText(email)).toBeVisible();
      // E deve esserci il modo di farselo rimandare, senza ridigitarlo.
      await expect(page.getByRole("button", { name: /invia di nuovo/i })).toBeVisible();
    }
  });

  test("i documenti che si accettano sono raggiungibili dal modulo", async ({ page }) => {
    // Chiedere di accettare qualcosa senza dare modo di leggerlo è un consenso
    // che non vale.
    await page.goto("/registrati");
    await expect(page.getByRole("link", { name: /termini di servizio/i })).toHaveAttribute(
      "href",
      "/termini"
    );
    await expect(page.getByRole("link", { name: /informativa privacy/i })).toHaveAttribute(
      "href",
      "/privacy"
    );
  });
});

test.describe("i documenti legali esistono e sono leggibili", () => {
  for (const [percorso, titolo] of [
    ["/termini", /termini di servizio/i],
    ["/privacy", /informativa privacy/i],
  ] as const) {
    test(`${percorso} risponde e ha un titolo`, async ({ page }) => {
      const risposta = await page.goto(percorso);
      expect(risposta?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: titolo })).toBeVisible();
    });
  }
});

test.describe("il sito è navigabile dal telefono", () => {
  // Difetto trovato con la stessa lente: la navigazione pubblica esisteva solo
  // da 768px in su. Sotto, il sito non aveva un modo di andare da nessuna
  // parte — e chi arriva da Google arriva quasi sempre da telefono.
  test.use({ viewport: { width: 390, height: 844 } });

  test("dal telefono si raggiungono tutte le sezioni", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /apri il menu/i }).click();
    const menu = page.getByRole("dialog", { name: /menu/i });
    await expect(menu).toBeVisible();

    for (const voce of ["Artisti", "Ingaggi", "Città", "Mappa", "Cerca"]) {
      await expect(menu.getByRole("link", { name: voce, exact: true })).toBeVisible();
    }
    // «Accedi» non sta più nel menu: ora è nell'intestazione a ogni
    // larghezza, che è il posto in cui lo si cerca. Il controllo si è
    // spostato in mobile.spec.ts, dove verifica che sia visibile *senza*
    // aprire niente.
  });

  test("il menu porta davvero dove dice", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /apri il menu/i }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Artisti", exact: true }).click();
    await expect(page).toHaveURL(/\/artisti$/);
  });

  test("si chiude con Escape", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /apri il menu/i }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("area personale e sito pubblico sono due posti diversi", () => {
  test("la barra superiore c'è sul sito pubblico", async ({ page, viewport }) => {
    await page.goto("/");

    // La stessa navigazione ha due forme: la fila orizzontale da 768px in su,
    // il pulsante del menu sotto. Verificare solo la prima significava
    // pretendere il layout da computer su un telefono, e fallire su tre
    // profili su quattro per un comportamento voluto.
    const barra =
      (viewport?.width ?? 1280) >= 768
        ? page.getByRole("navigation", { name: /navigazione principale/i })
        : page.getByRole("button", { name: /apri il menu/i });

    await expect(barra).toBeVisible();
  });

  test("dentro la dashboard non c'è", async ({ page }) => {
    // Non autenticati si viene rimandati al login, che è comunque una pagina
    // pubblica: il controllo vero è che /accedi mostri la barra e /dashboard
    // no. Senza sessione non possiamo entrare, quindi verifichiamo almeno che
    // il reindirizzamento avvenga — la separazione la copre il test manuale.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/accedi/);
  });
});

test.describe("segnalare un contenuto è possibile senza account", () => {
  test("il modulo si apre e chiede un motivo", async ({ page }) => {
    // Il Digital Services Act non riserva la segnalazione agli iscritti: chi
    // arriva da una ricerca e incappa in un contenuto illecito deve poterlo
    // dire senza registrarsi.
    await page.goto("/artisti");
    const primo = page.locator('a[href^="/artisti/"]').first();
    test.skip((await primo.count()) === 0, "nessun profilo pubblico");

    await page.goto((await primo.getAttribute("href"))!);

    const segnala = page.getByRole("button", { name: /segnala/i });
    await expect(segnala).toBeVisible();
    await segnala.click();

    await expect(page.getByRole("group", { name: /cosa non va/i })).toBeVisible();
    await expect(page.getByRole("radio").first()).toBeVisible();
  });
});

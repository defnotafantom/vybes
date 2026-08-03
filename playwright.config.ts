import { defineConfig, devices } from "@playwright/test";
import { config as caricaEnv } from "dotenv";

/**
 * I file `.env` non li legge Node da solo, e questo file è Node.
 *
 * Serve perché `E2E_DATABASE_URL` — il branch dedicato ai test — si scrive in
 * `.env.local`, che non è versionato. Senza questa riga la variabile sarebbe
 * visibile allo script di controllo (che il file lo legge a mano) ma non a
 * questa configurazione, e il server dei test continuerebbe a usare il
 * database di sempre: il controllo direbbe di sì e le scritture andrebbero
 * comunque in produzione.
 *
 * `override: false` è il valore predefinito e va bene: chi esporta la
 * variabile nel terminale deve vincere sul file.
 */
caricaEnv({ path: ".env.local" });
caricaEnv({ path: ".env" });

/**
 * Porta 3100, non 3000.
 *
 * `reuseExistingServer` faceva riusare a Playwright un server già in ascolto
 * sulla porta di sviluppo. Con `npm run dev` aperto in un'altra finestra —
 * cioè quasi sempre, mentre si lavora — la suite non testava il build di
 * produzione ma il server di sviluppo, che compila ogni rotta al primo
 * accesso: il primo `goto` su una pagina mai visitata può superare i trenta
 * secondi, e i test cominciano a fallire per lentezza invece che per difetti.
 *
 * Sono fallimenti particolarmente costosi perché sembrano veri: un clic che
 * «non naviga» e una pagina che «non si carica» si leggono come regressioni,
 * e si perde tempo a cercarle nel codice.
 *
 * Con una porta dedicata i due mondi non si toccano mai: il server di sviluppo
 * resta dov'è, e i test costruiscono e avviano il proprio.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

/**
 * Su quali telefoni gira davvero la suite.
 *
 * ── Il buco che c'era ──
 *
 * C'erano due progetti, `chromium` e `mobile` (un Pixel 7). Il secondo però
 * non veniva mai eseguito — la CI lanciava `--project=chromium` e basta — e
 * soprattutto usava lo stesso motore del primo: un Pixel 7 in Playwright è
 * Chromium con una finestra più stretta e un altro user agent.
 *
 * Conta perché i difetti mobile corretti in ADR-027 sono quasi tutti
 * **specifici di WebKit**: l'ingrandimento automatico sui campi sotto i 16px,
 * `vh` che misura la finestra senza la barra degli indirizzi, la safe-area
 * sotto la barra gestuale. Erano corretti e verificati su un motore che non
 * li riproduce — che è un modo elegante di non averli verificati.
 *
 * ── I tre profili ──
 *
 * **`android`** (Pixel 7, Blink) è la maggioranza del traffico italiano. La
 * sua particolarità rispetto a iOS: la tastiera *restringe* la finestra
 * invece di sovrapporsi, quindi un pannello a tutta altezza si comporta
 * diversamente mentre si scrive.
 *
 * **`iphone`** (iPhone 13, WebKit). Su iOS il motore è obbligatorio: anche
 * Chrome e Firefox per iPhone sono WebKit sotto la scocca, quindi questo
 * profilo copre *tutti* i browser di *tutti* gli iPhone, non solo Safari.
 *
 * **`iphone-se`** (WebKit a 320px) è il caso stretto. Non è un telefono
 * diffuso: è il limite inferiore in cui le cose si rompono, e sta lì per
 * trovarle prima che lo faccia qualcun altro.
 *
 * Tre profili invece di dieci perché ciò che distingue un telefono da un
 * altro, per un sito, è il **motore** e la **larghezza**. Un Galaxy S23 e un
 * Pixel 7 eseguono lo stesso Blink a larghezze quasi identiche: aggiungerlo
 * raddoppierebbe il tempo della suite per rieseguire gli stessi rami di
 * codice.
 *
 * ── Cosa resta scoperto, e va detto ──
 *
 * Un telefono emulato non è un telefono. Restano fuori le tastiere di
 * sistema vere, la memoria e la rete reali, e il comportamento della barra
 * degli indirizzi durante lo scorrimento, che si emula male ovunque. Questi
 * profili trovano i difetti di layout e di interazione, non quelli di
 * prestazione: quelli arrivano dai Core Web Vitals raccolti sul traffico
 * vero.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  /**
   * Meno lavoratori del numero di core, e non è pigrizia.
   *
   * Con il valore predefinito — metà dei core, sei su questa macchina — i
   * processi WebKit morivano prima ancora di aprire una pagina:
   *
   *     browserType.launch: Target page, context or browser has been closed
   *     [pid=26032] <process did exit: exitCode=3236495362, signal=null>
   *
   * `3236495362` è `0xC0000142`, cioè «inizializzazione della DLL fallita»:
   * su Windows è il sintomo classico dell'esaurimento della desktop heap,
   * non di un difetto del sito. Tre browser diversi moltiplicati per sei
   * processi contemporanei bastano ad arrivarci.
   *
   * Il costo di scendere è di qualche decina di secondi su una suite che ne
   * impiega poco più di tre minuti. Il costo di restare è peggiore di così:
   * fallimenti che sembrano regressioni, in test diversi a ogni giro, che
   * fanno perdere tempo a cercare difetti che non esistono e insegnano a non
   * fidarsi del rosso.
   */
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: BASE_URL, trace: "on-first-retry", locale: "it-IT" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    {
      name: "iphone-se",
      use: { ...devices["iPhone SE"], viewport: { width: 320, height: 568 } },
    },
  ],
  // Riusa un server già avviato invece di farne partire un altro.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // `build:e2e` è `next build` senza `prisma generate`.
        //
        // Su Windows `prisma generate` deve sostituire
        // `query_engine-windows.dll.node`, e il file è bloccato finché un
        // processo Node lo tiene aperto: con `npm run dev` in un'altra
        // finestra — cioè quasi sempre, mentre si lavora — il comando muore
        // con EPERM e i test non partono nemmeno.
        //
        // Rigenerare qui non serviva a niente: il client è già stato
        // generato da `postinstall`, e chi tocca lo schema passa comunque da
        // `prisma migrate dev`, che rigenera. Il rischio residuo è un client
        // vecchio se qualcuno modifica `schema.prisma` senza migrare — ma in
        // quel caso il tipo non compila, e `npm run verify` se ne accorge
        // prima.
        command: "npm run build:e2e && npm run start -- -p 3100",
        url: BASE_URL,
        // Senza questa riga la sitemap dichiarerebbe gli URL del `.env` di
        // sviluppo (porta 3000) mentre i test interrogano la 3100: il
        // controllo «gli indirizzi in sitemap sono quelli del sito» fallirebbe
        // per una discrepanza di configurazione e non per un difetto. È lo
        // stesso vincolo che in produzione impedisce alla sitemap di
        // dichiarare il dominio effimero del deployment.
        env: {
          NEXT_PUBLIC_SITE_URL: BASE_URL,
          /**
           * La suite registra una dozzina di account in tre minuti, tutti da
           * `127.0.0.1`: quattro profili di browser, ognuno che ne crea due
           * per percorrere il flusso completo. Il limite vero è cinque al
           * minuto per indirizzo — giusto per le persone — quindi dal sesto
           * in poi il modulo rispondeva «Troppe richieste» e i test
           * accusavano la registrazione di non funzionare.
           *
           * Si spegne qui e non si alza la soglia: quella deve restare
           * pensata per chi si iscrive davvero, e il comportamento del
           * limitatore ha i propri test unitari, che non hanno bisogno di un
           * browser. `env.ts` rifiuta l'avvio se questa variabile compare in
           * produzione.
           */
          RATE_LIMIT_DISABILITATO: "1",
          /**
           * E soprattutto: il server dei test non deve toccare il Redis di
           * produzione. Senza queste due righe vuote i contatori del
           * limitatore sarebbero **gli stessi** che governano il traffico
           * vero — una suite lanciata due volte di fila consumerebbe la quota
           * di chi si sta iscrivendo in quel momento. È lo stesso principio
           * per cui i test hanno un database separato.
           */
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
          // Il server dei test riceve il database dei test, se dichiarato.
          // Senza questa riga `E2E_DATABASE_URL` resterebbe una variabile che
          // nessuno legge: il controllo passerebbe e le scritture andrebbero
          // comunque in produzione — cioè il difetto di prima, con in più la
          // convinzione di averlo risolto.
          ...(process.env.E2E_DATABASE_URL
            ? { DATABASE_URL: process.env.E2E_DATABASE_URL, DIRECT_URL: process.env.E2E_DATABASE_URL }
            : {}),
        },
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});

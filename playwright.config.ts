import { defineConfig, devices } from "@playwright/test";

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
        command: "npm run build && npm run start -- -p 3100",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});

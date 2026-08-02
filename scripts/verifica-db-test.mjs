/**
 * Rifiuta di far partire i test se il database non è stato scelto apposta.
 *
 * ── Il problema che previene ──
 *
 * `percorso-critico.spec.ts` compila davvero il modulo di registrazione: è
 * l'unico modo di verificare che chi si iscrive finisca da qualche parte, il
 * difetto peggiore mai trovato su questo sito. Ogni esecuzione crea quindi
 * account veri, uno per profilo del browser.
 *
 * Con `DATABASE_URL` che punta a Neon, finivano in produzione. Nessuno se ne
 * era accorto per settimane, perché non compaiono negli elenchi pubblici —
 * `PROFILO_PUBBLICO` richiede l'email confermata — e quindi il sito sembrava
 * pulito mentre la tabella si riempiva. È venuto fuori da un numero di
 * contorno in `/api/health`: gli utenti erano passati da 9 a 18 in un
 * pomeriggio.
 *
 * ── Come lo riconosce, e come *non* lo riconosce ──
 *
 * La prima versione di questo controllo guardava l'hostname, cercando parole
 * come `test` o `staging`. Non funziona con Neon: gli endpoint hanno nomi
 * autogenerati — `ep-sweet-cloud-agamab83` — e **il nome del branch non
 * compare nell'indirizzo**. Un branch creato apposta per i test sarebbe stato
 * rifiutato esattamente come la produzione.
 *
 * Era anche il tipo di controllo sbagliato: cercava di *indovinare* le
 * intenzioni da una stringa. Adesso le chiede.
 *
 * `E2E_DATABASE_URL` è la dichiarazione esplicita: se c'è, i test usano
 * quella e nient'altro. Se non c'è, non partono. Non resta niente da
 * interpretare, e nessun formato di indirizzo può ingannare il controllo.
 *
 * ── Come si configura, una volta sola ──
 *
 * Su Neon: **Branches → Create branch**, parent `production`, senza
 * auto-delete. Poi si copia la sua connection string (quella *pooled*) e la
 * si mette in `.env.local`, che non è versionato e ha la precedenza su
 * `.env`:
 *
 *     E2E_DATABASE_URL="postgresql://...branch di test..."
 *
 * Da quel momento `npm run test:e2e` funziona senza altri passaggi.
 *
 * ── La via d'uscita ──
 *
 * `E2E_CONSENTI_DB_PRODUZIONE=1` fa girare i test sul database configurato in
 * `DATABASE_URL`. È volutamente lunga e scomoda: deve costare più che creare
 * il branch.
 */
import { readFileSync, existsSync } from "node:fs";

/** I file `.env` non li legge Node da solo. L'ambiente ha la precedenza. */
function daFile(chiave) {
  for (const nome of [".env.local", ".env"]) {
    if (!existsSync(nome)) continue;
    for (const riga of readFileSync(nome, "utf8").split("\n")) {
      const m = riga.match(new RegExp(`^\\s*${chiave}\\s*=\\s*"?([^"\\n]+?)"?\\s*$`));
      if (m) return m[1];
    }
  }
  return "";
}

const perTest = process.env.E2E_DATABASE_URL || daFile("E2E_DATABASE_URL");
const attuale = process.env.DATABASE_URL || daFile("DATABASE_URL");

function host(u) {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
}

if (process.env.E2E_CONSENTI_DB_PRODUZIONE === "1") {
  console.log(`  ⚠  E2E_CONSENTI_DB_PRODUZIONE=1 — i test scriveranno su ${host(attuale)}`);
  process.exit(0);
}

// Un database locale non ha bisogno di dichiarazioni: non è di nessuno.
if (/^(localhost|127\.0\.0\.1|::1|host\.docker\.internal)$/.test(host(attuale)) && !perTest) {
  console.log(`  ✓ database locale (${host(attuale)})`);
  process.exit(0);
}

if (!perTest) {
  console.error(
    `\n  I test end-to-end creano account veri, e non è stato dichiarato un` +
      `\n  database su cui possono farlo.\n` +
      `\n  Attuale: ${host(attuale) || "(nessuno)"}\n` +
      `\n  Su Neon: Branches → Create branch, parent "production", senza` +
      `\n  auto-delete. Poi in .env.local (non versionato):\n` +
      `\n      E2E_DATABASE_URL="postgresql://...branch di test..."\n` +
      `\n  Se vuoi davvero girare sul database attuale:\n` +
      `\n      $env:E2E_CONSENTI_DB_PRODUZIONE="1"\n`
  );
  process.exit(1);
}

// Dichiarata sì, ma uguale a quella di produzione: è l'errore di chi copia la
// riga sbagliata, e senza questo controllo passerebbe inosservato.
if (perTest.trim() === attuale.trim()) {
  console.error(
    `\n  E2E_DATABASE_URL è identica a DATABASE_URL: non è un database separato.\n` +
      `\n  Controlla di aver copiato la connection string del branch di test e` +
      `\n  non quella di produzione.\n`
  );
  process.exit(1);
}

console.log(`  ✓ database dei test: ${host(perTest)}`);

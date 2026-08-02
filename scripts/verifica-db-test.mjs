/**
 * Rifiuta di far partire i test se il database è quello di produzione.
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
 * pulito mentre la tabella si riempiva. È venuto fuori da un numero in
 * `/api/health`: gli utenti erano passati da 9 a 18 in un pomeriggio.
 *
 * Oggi i test solo creano. Il giorno in cui uno dovesse cancellare o
 * modificare qualcosa per verificare un percorso — e prima o poi capita, è il
 * genere di verifica che serve — lo farebbe su dati veri.
 *
 * ── Perché un controllo e non solo una nota nella documentazione ──
 *
 * Una nota si legge una volta e si dimentica. Questo è lo stesso schema di
 * quasi tutti i difetti trovati su questo progetto: la regola esisteva, era
 * scritta da qualche parte, e non era applicata da niente.
 *
 * ── Come riconosce la produzione ──
 *
 * Per esclusione, che è l'unico verso sicuro: **tutto è produzione tranne ciò
 * che è riconoscibilmente locale o di prova**. Il contrario — un elenco di
 * host da bloccare — fallirebbe in silenzio il giorno in cui il database
 * cambia indirizzo, ed è precisamente il caso in cui servirebbe.
 *
 * ── Come si sblocca ──
 *
 * Con un branch Neon dedicato ai test (si crea in pochi secondi, gratis, con
 * lo stesso schema):
 *
 *     $env:DATABASE_URL="...branch di test..."
 *     npm run test:e2e
 *
 * Oppure, se si sa quello che si sta facendo e si accetta di sporcare i dati:
 *
 *     $env:E2E_CONSENTI_DB_PRODUZIONE="1"
 *
 * La variabile è volutamente lunga e scomoda: deve costare più che creare il
 * branch.
 */
import { readFileSync, existsSync } from "node:fs";

/**
 * `DATABASE_URL` può arrivare dall'ambiente — è così che si passa un branch
 * di prova — oppure dai file `.env`, che Node non legge da solo. L'ordine
 * segue quello di Next: chi la esporta nel terminale vince su ciò che è
 * scritto nei file, altrimenti sovrascrivere il proprio `.env` per un giro di
 * test sarebbe l'unica strada.
 */
function daFile() {
  for (const nome of [".env.local", ".env"]) {
    if (!existsSync(nome)) continue;
    for (const riga of readFileSync(nome, "utf8").split("\n")) {
      const m = riga.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
      if (m) return m[1];
    }
  }
  return "";
}

const url = process.env.DATABASE_URL || daFile();

if (!url) {
  console.error("\n  DATABASE_URL non è impostata: i test non hanno un database.\n");
  process.exit(1);
}

if (process.env.E2E_CONSENTI_DB_PRODUZIONE === "1") {
  console.log("  ⚠  E2E_CONSENTI_DB_PRODUZIONE=1 — i test scriveranno sul database configurato.");
  process.exit(0);
}

/** Un host è di prova se è locale, oppure se lo dichiara nel nome. */
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();

const diProva =
  /^(localhost|127\.0\.0\.1|::1|host\.docker\.internal)$/.test(host) ||
  /\b(test|staging|preview|dev|e2e|shadow)\b/.test(host) ||
  // I branch Neon portano il proprio nome nell'host: `ep-<nome>-<id>`.
  /-(test|staging|e2e)-/.test(host);

if (!diProva) {
  console.error(
    `\n  I test end-to-end creano account veri, e questo database non sembra di prova.\n` +
      `\n  Host: ${host || "(non riconosciuto)"}\n` +
      `\n  Crea un branch su Neon e usalo solo per i test:\n` +
      `\n      $env:DATABASE_URL="...connection string del branch..."\n` +
      `      npm run test:e2e\n` +
      `\n  Se vuoi davvero procedere su questo database:\n` +
      `\n      $env:E2E_CONSENTI_DB_PRODUZIONE="1"\n`
  );
  process.exit(1);
}

console.log(`  ✓ database di prova (${host})`);

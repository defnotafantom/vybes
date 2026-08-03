/**
 * Avvia il server di sviluppo sul database dei dati dimostrativi.
 *
 *   npm run dev:demo
 *
 * ── Il buco che chiude ──
 *
 * `npm run demo:popola` si rifiuta, giustamente, di scrivere sul database di
 * produzione: trenta artisti inventati su un dominio indicizzato sarebbero
 * pagine pubbliche di persone che non esistono. Li scrive quindi su
 * `DEMO_DATABASE_URL`.
 *
 * Solo che `npm run dev` legge `DATABASE_URL`. Il risultato è che si popola un
 * database e se ne guarda un altro: la pagina degli artisti continuava a
 * mostrarne sette, e sembrava che lo script non avesse funzionato — mentre
 * aveva funzionato benissimo, altrove.
 *
 * È lo stesso schema di difetto che questo progetto ha incontrato più volte:
 * la difesa è stata messa e la conseguenza della difesa no. Separare i dati
 * senza dare un modo di guardarli è una separazione fatta a metà.
 *
 * ── Perché uno script e non una variabile nel comando ──
 *
 * Perché `DATABASE_URL=... next dev` è sintassi di shell POSIX, e su
 * PowerShell — che è dove questo progetto si sviluppa — non funziona. Le
 * alternative sarebbero una dipendenza in più (`cross-env`) o due comandi
 * diversi da tenere allineati. Venti righe di Node costano meno di entrambe.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

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

const demo = process.env.DEMO_DATABASE_URL || daFile("DEMO_DATABASE_URL");

if (!demo) {
  console.error(
    "DEMO_DATABASE_URL non è configurata.\n\n" +
      "È il database su cui `npm run demo:popola` scrive gli artisti finti.\n" +
      "Mettila in .env.local — va bene lo stesso branch che usi per i test:\n\n" +
      '    DEMO_DATABASE_URL="postgresql://…"\n\n' +
      "Per lo sviluppo sui dati veri: npm run dev"
  );
  process.exit(1);
}

let host = "";
try {
  host = new URL(demo).hostname;
} catch {
  console.error("DEMO_DATABASE_URL non è un indirizzo valido.");
  process.exit(1);
}

console.log(`\n  Dati dimostrativi: ${host}`);
console.log("  Non è la produzione. Quello che vedi qui non è online.\n");

spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    // `DIRECT_URL` insieme: le pagine non lo usano, ma un `prisma` lanciato
    // per sbaglio da questo terminale finirebbe altrimenti sul database
    // sbagliato — e sarebbe di nuovo il difetto che questo file esiste per
    // chiudere, al contrario.
    DATABASE_URL: demo,
    DIRECT_URL: demo,
  },
}).on("exit", (code) => process.exit(code ?? 0));

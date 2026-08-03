/**
 * Prova le connessioni ai database configurati e dice quali funzionano.
 *
 *   npm run db:verifica
 *
 * ── Perché serve ──
 *
 * Un errore di credenziali arriva nel posto sbagliato. La prima volta si è
 * presentato così:
 *
 *     [WebServer] Build error occurred
 *     [WebServer] Failed to collect page data for /eventi/[slug]
 *     Error: Process from config.webServer was not able to start.
 *
 * Cioè: i test non partono, la build fallisce, e la riga che spiega davvero
 * cosa è successo — «Authentication failed against database server» — sta in
 * mezzo a un blocco di traccia di Prisma dentro l'output di Playwright. Chi
 * legge conclude che si è rotto il codice.
 *
 * Qui la stessa informazione arriva in due righe, e dice quale delle tre
 * connessioni è quella rotta. Sono cose diverse: `DATABASE_URL` che non
 * risponde è la produzione giù, `E2E_DATABASE_URL` che non risponde sono solo
 * i test.
 *
 * ── Cosa non stampa ──
 *
 * Le password. Di ogni indirizzo si vede l'host e basta — che è tutto ciò che
 * serve per capire *quale* database è, e niente di ciò che serve per entrarci.
 * Questo file può finire in una chat, in un ticket o in uno screenshot senza
 * conseguenze, ed è il motivo per cui esiste invece di un `console.log` della
 * variabile.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

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

function host(u) {
  try {
    return new URL(u).hostname;
  } catch {
    return "indirizzo illeggibile";
  }
}

const DA_PROVARE = [
  ["DATABASE_URL", "produzione — quello che serve il traffico vero"],
  ["E2E_DATABASE_URL", "test — `npm run test:e2e` scrive qui"],
  ["DEMO_DATABASE_URL", "dati dimostrativi — `npm run demo:popola` scrive qui"],
];

let rotte = 0;

for (const [chiave, aCosaServe] of DA_PROVARE) {
  const url = process.env[chiave] || daFile(chiave);

  if (!url) {
    console.log(`○ ${chiave.padEnd(18)} non configurata   (${aCosaServe})`);
    continue;
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    // Una query che non dipende da nessuna tabella: se il collegamento e le
    // credenziali vanno, questa risponde. Se fallisce, il problema è a monte
    // dello schema.
    await prisma.$queryRaw`SELECT 1`;
    const utenti = await prisma.user.count().catch(() => null);
    console.log(
      `✓ ${chiave.padEnd(18)} ${host(url)}` +
        (utenti === null ? "   (schema assente: manca una migrazione)" : `   ${utenti} utenti`)
    );
  } catch (e) {
    rotte++;
    const msg = String(e?.message ?? e);
    const causa = /Authentication failed/i.test(msg)
      ? "credenziali rifiutate"
      : /Can't reach database server|ECONNREFUSED|ETIMEDOUT/i.test(msg)
        ? "server irraggiungibile o sospeso"
        : msg.split("\n").find((r) => r.trim()) || "errore sconosciuto";
    console.log(`✗ ${chiave.padEnd(18)} ${host(url)}   ${causa}`);

    if (causa === "credenziali rifiutate") {
      console.log(
        `\n  La password in ${chiave} non è quella del ruolo su quel database.\n` +
          "  Succede tipicamente dopo una rotazione: reimpostarla sul branch\n" +
          "  principale non la cambia sui branch figli, che hanno una copia\n" +
          "  indipendente del ruolo.\n\n" +
          "  Rimedio, sulla console Neon:\n" +
          "    Branches → il branch giusto → Connection string → copia quella\n" +
          "    *pooled* e rimettila in .env.local. Non passarla da nessun'altra\n" +
          "    parte.\n"
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

process.exitCode = rotte > 0 ? 1 : 0;

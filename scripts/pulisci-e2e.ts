/**
 * Cancella gli account lasciati dai test end-to-end.
 *
 * ── Perché serve ──
 *
 * `percorso-critico.spec.ts` compila davvero il modulo di registrazione: è
 * l'unico modo di verificare che chi si iscrive finisca da qualche parte, che
 * era il difetto peggiore mai trovato su questo sito. Ogni esecuzione crea
 * quindi un account vero, uno per profilo del browser — quattro a giro.
 *
 * Se `DATABASE_URL` punta al database di produzione, quegli account finiscono
 * lì. Non compaiono negli elenchi pubblici, perché `PROFILO_PUBBLICO` richiede
 * l'email confermata e quella non lo sarà mai — ma restano nei conteggi, nelle
 * statistiche e in `/api/health`, e crescono di quattro a ogni esecuzione.
 *
 * ── La soluzione vera, e perché questo script non lo è ──
 *
 * La cosa giusta è far girare i test su un database separato. Questo script
 * ripulisce, non previene: serve finché quella separazione non c'è, e per i
 * residui già accumulati.
 *
 * ── Sicurezza ──
 *
 * Cancella **solo** gli indirizzi che corrispondono al formato generato dai
 * test — `e2e-<numero>-<lettere>@example.com` — e mai un account con un ruolo
 * di moderazione. Senza `--conferma` mostra e basta.
 *
 *   npm run pulisci:e2e
 *   npm run pulisci:e2e -- --conferma
 */
import { prisma } from "../src/lib/prisma";

/**
 * Lo stesso formato di `emailUnica()` nei test, scritto come espressione
 * regolare. Volutamente stretto: `@example.com` da solo prenderebbe anche un
 * account creato a mano per una prova, e `e2e` da solo prenderebbe un nome
 * proprio che per caso lo contiene.
 */
const FORMATO = /^e2e-\d+-[a-z0-9]+@example\.com$/;

const conferma = process.argv.includes("--conferma");

async function main() {
  // Il filtro grossolano lo fa il database, quello preciso l'espressione
  // regolare: `startsWith` in SQL non sa esprimere il formato completo, e
  // fidarsi solo di quello significherebbe cancellare più del dovuto.
  const candidati = await prisma.user.findMany({
    where: { email: { startsWith: "e2e-" }, emailVerified: null },
    select: {
      id: true,
      email: true,
      name: true,
      adminRole: true,
      createdAt: true,
      _count: { select: { posts: true, portfolioItems: true, participations: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const daCancellare = candidati.filter((u) => FORMATO.test(u.email));

  if (daCancellare.length === 0) {
    console.log("Nessun account di prova da rimuovere.");
    return;
  }

  // Non dovrebbe mai succedere, ma se un account di prova avesse un ruolo di
  // moderazione il problema sarebbe più grande di questo script.
  const conRuolo = daCancellare.filter((u) => u.adminRole);
  if (conRuolo.length > 0) {
    console.error(`Rifiuto: ${conRuolo.map((u) => u.email).join(", ")} hanno un ruolo di moderazione.`);
    process.exitCode = 1;
    return;
  }

  for (const u of daCancellare) {
    const roba = u._count.posts + u._count.portfolioItems + u._count.participations;
    console.log(
      `${u.email.padEnd(42)} ${u.createdAt.toISOString().slice(0, 10)}` +
        (roba > 0 ? `  ⚠ ${roba} contenuti collegati` : "")
    );
  }

  if (!conferma) {
    console.log(
      `\n${daCancellare.length} account. Niente è stato scritto: rilancia con --conferma per cancellarli.`
    );
    return;
  }

  const { count } = await prisma.user.deleteMany({ where: { id: { in: daCancellare.map((u) => u.id) } } });
  console.log(`\n${count} account rimossi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

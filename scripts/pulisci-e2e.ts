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
import { PrismaClient } from "@prisma/client";
import { config as caricaEnv } from "dotenv";

// `.env.local` non lo legge Node da solo, e `E2E_DATABASE_URL` sta lì.
caricaEnv({ path: ".env.local" });
caricaEnv({ path: ".env" });

/**
 * Lo stesso formato di `emailUnica()` nei test, scritto come espressione
 * regolare. Volutamente stretto: `@example.com` da solo prenderebbe anche un
 * account creato a mano per una prova, e `e2e` da solo prenderebbe un nome
 * proprio che per caso lo contiene.
 */
const FORMATO = /^e2e-\d+-[a-z0-9]+@example\.com$/;

const conferma = process.argv.includes("--conferma");

/**
 * Su quale database, ed è il punto che mancava.
 *
 * Questo script importava `prisma` da `src/lib/prisma`, che legge
 * `DATABASE_URL`: la produzione. Aveva senso quando i test scrivevano lì —
 * era il difetto che lo ha fatto nascere. Da quando `E2E_DATABASE_URL`
 * esiste, gli account di prova nascono sul branch dedicato e questo script
 * andava a cercarli dalla parte sbagliata: diceva «nessun account da
 * rimuovere» mentre erano decine, e intanto la directory dimostrativa era
 * piena di «Prova Artista» e «Prova Telefono».
 *
 * È la terza volta che succede la stessa cosa su questo progetto — la difesa
 * sposta le scritture e gli strumenti non la seguono. Prima `npm run dev`,
 * che guardava un database mentre `demo:popola` ne riempiva un altro; ora
 * questo.
 *
 * La regola che ne esce: **quando si separa un database, vanno spostati con
 * lui tutti gli strumenti che lo toccano.** Una separazione che ne lascia
 * indietro uno non è più sicura, è solo più difficile da capire.
 *
 * Resta possibile pulire la produzione — `E2E_DATABASE_URL` vuota, oppure i
 * residui di quando i test ci scrivevano davvero — ma va detto quale.
 */
function bersaglio(): { url: string | undefined; dove: string } {
  const perTest = process.env.E2E_DATABASE_URL;
  if (!perTest) return { url: undefined, dove: "DATABASE_URL (nessun branch di test dichiarato)" };
  if (process.argv.includes("--produzione")) {
    return { url: undefined, dove: "DATABASE_URL (richiesto con --produzione)" };
  }
  return { url: perTest, dove: "E2E_DATABASE_URL, dove i test scrivono davvero" };
}

const { url, dove } = bersaglio();
// Senza `url` si lascia decidere a Prisma, che legge `DATABASE_URL` da sé.
const prisma = url
  ? new PrismaClient({ datasources: { db: { url } } })
  : new PrismaClient();

async function main() {
  console.log(`Database: ${dove}\n`);
  // ── Perché non si filtra su `emailVerified: null` ──
  //
  // La prima versione lo faceva, dando per scontato che un account creato dai
  // test non potesse avere l'email confermata. È falso, e in modo pericoloso:
  // quando `RESEND_API_KEY` non è configurata la verifica viene disattivata e
  // la registrazione marca l'indirizzo come già confermato, per non lasciare
  // chi si iscrive in un limbo da cui non può uscire.
  //
  // Il risultato è che gli account dei test risultano **verificati e
  // pubblici**, quindi compaiono nella directory con slug come
  // `prova-percorso-7` — e lo script scritto per rimuoverli non li vedeva
  // nemmeno, perché cercava l'esatto contrario.
  //
  // Il filtro grossolano lo fa il database, quello preciso l'espressione
  // regolare: `startsWith` in SQL non sa esprimere il formato completo, e
  // fidarsi solo di quello significherebbe cancellare più del dovuto.
  const candidati = await prisma.user.findMany({
    where: { email: { startsWith: "e2e-" } },
    select: {
      id: true,
      email: true,
      name: true,
      adminRole: true,
      slug: true,
      isPublic: true,
      emailVerified: true,
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

  // `adminRole` è una stringa con default "NONE", non un campo nullable:
  // `if (u.adminRole)` è quindi **sempre vero**, perché "NONE" è una stringa
  // non vuota. Con quel confronto lo script rifiutava di cancellare
  // qualunque cosa, dicendo che nove account di prova avevano un ruolo di
  // moderazione.
  //
  // Il difetto è passato inosservato perché il messaggio d'errore era
  // plausibile e il comportamento — non cancellare — sembra il lato
  // prudente. Un controllo di sicurezza che blocca sempre non protegge
  // niente: rende solo inutile lo strumento, e chi ha fretta lo aggira a
  // mano.
  const conRuolo = daCancellare.filter((u) => u.adminRole !== "NONE");
  if (conRuolo.length > 0) {
    console.error(`Rifiuto: ${conRuolo.map((u) => u.email).join(", ")} hanno un ruolo di moderazione.`);
    process.exitCode = 1;
    return;
  }

  for (const u of daCancellare) {
    const roba = u._count.posts + u._count.portfolioItems + u._count.participations;
    // Se è pubblico va detto: significa che è finito nella directory, e non
    // è un residuo invisibile ma una pagina che qualcuno può aver aperto.
    const pubblico = u.isPublic && u.emailVerified ? `  ← pubblico su /artisti/${u.slug}` : "";
    console.log(
      `${u.email.padEnd(42)} ${u.createdAt.toISOString().slice(0, 10)}` +
        (roba > 0 ? `  ⚠ ${roba} contenuti collegati` : "") +
        pubblico
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

  // Le pagine che li mostravano sono generate staticamente e rigenerate ogni
  // ora: senza questo avviso resterebbero servite dalla cache, e chi controlla
  // subito dopo penserebbe che la cancellazione non abbia funzionato.
  if (daCancellare.some((u) => u.isPublic && u.emailVerified)) {
    console.log(
      "\nAlcuni erano pubblici: gli elenchi sono in cache e possono mostrarli\n" +
        "ancora per un'ora. Per svuotarla subito, un redeploy su Vercel."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

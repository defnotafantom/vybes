/**
 * Cambia l'indirizzo pubblico di un profilo.
 *
 *   npm run user:slug -- kkkk daniele
 *   npm run user:slug -- kkkk daniele --conferma
 *
 * ── Perché serve ──
 *
 * Lo slug nasce dal nome scritto al momento della registrazione e non cambia
 * più: il modulo del profilo non lo espone, e di proposito. In produzione
 * questo lascia però profili con indirizzi come `/artisti/kkkk`, nati da una
 * prova e diventati la pagina pubblica di una persona vera — nel nostro caso
 * quella che comparirà sul curriculum.
 *
 * ── Perché non è un campo del profilo ──
 *
 * Perché non è una preferenza, è **l'indirizzo di una pagina pubblica**. Un
 * campo modificabile a piacere significa collegamenti rotti ogni volta che
 * qualcuno cambia idea sul proprio nome d'arte: chi aveva salvato la pagina,
 * chi l'aveva mandata a un locale, e l'indice di Google, che ci mette
 * settimane a riallinearsi e nel frattempo manda le persone su un 404.
 *
 * Lo stesso motivo per cui la modifica di un ingaggio non tocca il suo slug.
 *
 * ── La difesa ──
 *
 * Lo script rifiuta di cambiare lo slug di un profilo che **può essere
 * nell'indice** — pubblico, email confermata, e sopra la soglia di contenuto
 * di ADR-018. Non perché sia impossibile, ma perché in quel caso il cambio ha
 * un costo che va deciso a occhi aperti: il vecchio indirizzo non risponde
 * più, e qui non esiste nessun reindirizzamento che lo raccolga.
 *
 * Su un profilo scarno quel costo non c'è: la pagina non è in nessun indice,
 * e nessuno ci è mai arrivato. È esattamente il momento giusto per cambiarlo,
 * ed è il motivo per cui questa operazione conviene farla **prima** di
 * riempire il profilo, non dopo.
 *
 * La via d'uscita è `--anche-se-indicizzato`, volutamente lunga da scrivere.
 */
import { PrismaClient } from "@prisma/client";
import { toSlug } from "../src/lib/slug";
import { isProfileIndexable } from "../src/lib/profile-quality";

const prisma = new PrismaClient();

async function main() {
  const argv = process.argv.slice(2);
  const conferma = argv.includes("--conferma");
  const forza = argv.includes("--anche-se-indicizzato");
  const [vecchio, nuovoGrezzo] = argv.filter((a) => !a.startsWith("--"));

  if (!vecchio || !nuovoGrezzo) {
    console.error(
      "Uso: npm run user:slug -- <slug attuale> <slug nuovo> [--conferma]\n" +
        "\nSenza --conferma non scrive niente: mostra solo cosa cambierebbe."
    );
    process.exit(1);
  }

  // Il nuovo slug passa dalla stessa normalizzazione della registrazione:
  // accettarlo così com'è significherebbe permettere maiuscole, accenti e
  // spazi in un indirizzo, cioè una regola valida solo per chi si registra.
  const nuovo = toSlug(nuovoGrezzo);
  if (!nuovo) {
    console.error(`«${nuovoGrezzo}» non produce uno slug utilizzabile.`);
    process.exit(1);
  }
  if (nuovo !== nuovoGrezzo) {
    console.log(`Normalizzato: «${nuovoGrezzo}» → «${nuovo}»`);
  }

  const utente = await prisma.user.findUnique({
    where: { slug: vecchio },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      disciplines: true,
      isPublic: true,
      emailVerified: true,
      _count: { select: { portfolioItems: true } },
    },
  });

  if (!utente) {
    console.error(`Nessun profilo con slug «${vecchio}».`);
    process.exit(1);
  }

  const occupato = await prisma.user.findUnique({
    where: { slug: nuovo },
    select: { id: true },
  });
  if (occupato && occupato.id !== utente.id) {
    console.error(`«${nuovo}» è già di qualcun altro. Scegline un altro.`);
    process.exit(1);
  }

  const indicizzabile =
    utente.isPublic &&
    Boolean(utente.emailVerified) &&
    isProfileIndexable({
      bio: utente.bio,
      disciplines: utente.disciplines,
      portfolioCount: utente._count.portfolioItems,
    });

  console.log(`\n${utente.name}`);
  console.log(`  /artisti/${utente.slug}  →  /artisti/${nuovo}`);
  console.log(
    `  ${indicizzabile ? "⚠ può essere già nell'indice dei motori di ricerca" : "non indicizzabile: nessun collegamento da rompere"}`
  );

  if (indicizzabile && !forza) {
    console.error(
      "\nRifiuto. Questo profilo supera la soglia di indicizzazione, quindi il\n" +
        "vecchio indirizzo può essere già noto a Google e salvato da qualcuno —\n" +
        "e cambiandolo smette di rispondere, senza nessun reindirizzamento.\n" +
        "\nSe è comunque quello che vuoi: --anche-se-indicizzato"
    );
    process.exitCode = 1;
    return;
  }

  if (!conferma) {
    console.log("\nNiente è stato scritto: rilancia con --conferma.");
    return;
  }

  await prisma.user.update({ where: { id: utente.id }, data: { slug: nuovo } });
  console.log(`\nFatto: /artisti/${nuovo}`);

  // Gli elenchi pubblici sono generati staticamente e rigenerati a intervalli:
  // senza questo avviso il vecchio indirizzo sembrerebbe ancora vivo, e chi
  // controlla subito dopo penserebbe che il cambio non abbia funzionato.
  console.log(
    "\nGli elenchi sono in cache e possono mostrare il vecchio indirizzo\n" +
      "ancora per un'ora. Per svuotarla subito, un redeploy su Vercel."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * Elimina un account e tutto ciò che ne dipende.
 *
 *   npx tsx scripts/elimina-account.ts kkkk il-tuo-nome
 *   npx tsx scripts/elimina-account.ts kkkk --conferma
 *
 * Senza `--conferma` non cancella niente: mostra soltanto cosa sparirebbe.
 * È la scelta giusta per uno strumento distruttivo che gira su un database di
 * produzione — l'errore va reso difficile, non veloce.
 *
 * Serve a rimuovere gli account di prova finiti in produzione. La soglia di
 * qualità (ADR-018) li tiene già fuori dall'indice, ma restano visibili negli
 * elenchi pubblici, e un visitatore che li incontra capisce di essere su un
 * sito vuoto.
 *
 * Sulle cascate: lo schema dichiara `onDelete: Cascade` sulle relazioni che
 * appartengono all'utente, quindi post, portfolio, candidature e messaggi se
 * ne vanno con lui. Questo script non le replica a mano — ripetere una regola
 * già scritta nello schema significa doverla aggiornare in due posti. Le
 * conta, però, perché un numero inatteso è il segnale che stai cancellando la
 * persona sbagliata.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const argv = process.argv.slice(2);
  const conferma = argv.includes("--conferma");
  const slugs = argv.filter((a) => !a.startsWith("--"));

  if (slugs.length === 0) {
    console.error(
      "Uso: npx tsx scripts/elimina-account.ts <slug> [<slug>...] [--conferma]\n" +
        "\nSenza --conferma mostra solo cosa verrebbe eliminato."
    );
    process.exit(1);
  }

  const utenti = await prisma.user.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true,
      slug: true,
      name: true,
      email: true,
      adminRole: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          portfolioItems: true,
          eventsCreated: true,
          participations: true,
          comments: true,
          sentMessages: true,
          followers: true,
        },
      },
    },
  });

  const mancanti = slugs.filter((s) => !utenti.some((u) => u.slug === s));
  if (mancanti.length > 0) {
    console.error(`\nNessun account con questi slug: ${mancanti.join(", ")}`);
  }
  if (utenti.length === 0) process.exit(1);

  // Un moderatore non si cancella per sbaglio da riga di comando: se è
  // davvero quello che vuoi, togligli prima il ruolo.
  const moderatori = utenti.filter((u) => u.adminRole);
  if (moderatori.length > 0) {
    console.error(
      `\nRifiuto: ${moderatori.map((m) => `${m.slug} (${m.adminRole})`).join(", ")} ` +
        `${moderatori.length === 1 ? "ha" : "hanno"} un ruolo di moderazione.\n` +
        "Rimuovilo prima, se la cancellazione è intenzionale.\n"
    );
    process.exit(1);
  }

  console.log(`\n${conferma ? "ELIMINO" : "ANTEPRIMA —"} ${utenti.length} account:\n`);

  for (const u of utenti) {
    const c = u._count;
    const totale = Object.values(c).reduce((a, b) => a + b, 0);
    console.log(`  ${u.name}  ·  /artisti/${u.slug}  ·  ${u.email}`);
    console.log(`    iscritto il ${u.createdAt.toLocaleDateString("it-IT")}`);
    console.log(
      `    ${c.posts} post · ${c.portfolioItems} portfolio · ${c.eventsCreated} eventi · ` +
        `${c.participations} candidature · ${c.comments} commenti · ` +
        `${c.sentMessages} messaggi · ${c.followers} follower`
    );

    // Un account di prova ha quasi sempre zero di tutto. Un totale alto su un
    // account che credevi vuoto è il momento di fermarsi.
    if (totale > 20) {
      console.log(`    ⚠  ${totale} elementi collegati: sicuro che sia un account di prova?`);
    }
    console.log();
  }

  if (!conferma) {
    console.log("Niente è stato eliminato.");
    console.log("Rilancia con --conferma per procedere.\n");
    return;
  }

  const { count } = await prisma.user.deleteMany({
    where: { id: { in: utenti.map((u) => u.id) } },
  });

  console.log(`${count} account eliminati.\n`);
  console.log(
    "Le pagine pubbliche sono rigenerate a intervalli (ISR), quindi i profili\n" +
      "possono restare visibili ancora per un'ora. La sitemap si aggiorna con\n" +
      "lo stesso ritmo.\n"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

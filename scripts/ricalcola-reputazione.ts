/**
 * Riallinea la reputazione di tutti gli account alla formula attuale.
 *
 * ── Perché serve ──
 *
 * Fino a oggi `reputation` era un accumulo: ogni quest completata aggiungeva
 * dei punti e nessuno li toglieva mai. I valori in tabella sono quindi il
 * residuo di una regola che non esiste più, e finché restano lì la directory
 * pubblica continua a essere ordinata secondo la vecchia logica anche se il
 * codice ne applica una nuova. Il ricalcolo automatico scatta solo quando
 * qualcosa cambia — profilo salvato, portfolio modificato, candidatura
 * accettata — quindi un account fermo resterebbe con il vecchio punteggio per
 * sempre.
 *
 * ── Perché uno script e non una migrazione SQL ──
 *
 * La formula vive in TypeScript, con scaglioni e tetti che in SQL andrebbero
 * riscritti: due copie della stessa regola che divergono alla prima modifica.
 * Meglio pagare la lentezza di un ciclo applicativo una volta sola.
 *
 * ── Idempotente ──
 *
 * Calcola dallo stato, non dal valore precedente: rieseguirlo dieci volte dà
 * dieci volte lo stesso risultato. Si può lanciare senza pensarci dopo ogni
 * modifica ai pesi.
 *
 *   npm run reputazione:ricalcola
 *   npm run reputazione:ricalcola -- --prova     (mostra e non scrive)
 */
import { prisma } from "../src/lib/prisma";
import { calcolaReputazione } from "../src/lib/reputazione";

const prova = process.argv.includes("--prova");

async function main() {
  const utenti = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      reputation: true,
      emailVerified: true,
      isVerified: true,
      bio: true,
      headline: true,
      image: true,
      citySlug: true,
      disciplines: true,
      _count: {
        select: {
          portfolioItems: { where: { isPublic: true } },
          participations: { where: { status: "ACCEPTED" } },
          eventsCreated: { where: { status: "COMPLETED" } },
        },
      },
    },
  });

  let cambiati = 0;
  let saliti = 0;
  let scesi = 0;

  for (const u of utenti) {
    const nuova = calcolaReputazione({
      emailVerified: u.emailVerified,
      isVerified: u.isVerified,
      bio: u.bio,
      headline: u.headline,
      image: u.image,
      citySlug: u.citySlug,
      disciplines: u.disciplines,
      portfolio: u._count.portfolioItems,
      ingaggiConfermati: u._count.participations,
      ingaggiOrganizzati: u._count.eventsCreated,
    });

    if (nuova === u.reputation) continue;

    cambiati += 1;
    if (nuova > u.reputation) saliti += 1;
    else scesi += 1;

    console.log(
      `${u.name.padEnd(28).slice(0, 28)} ${String(u.reputation).padStart(4)} → ${String(nuova).padStart(4)}`
    );

    if (!prova) {
      await prisma.user.update({ where: { id: u.id }, data: { reputation: nuova } });
    }
  }

  console.log(
    `\n${utenti.length} account · ${cambiati} da aggiornare (${saliti} in salita, ${scesi} in discesa)` +
      (prova ? "\nNiente è stato scritto: rilancia senza --prova per applicare." : "\nFatto.")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

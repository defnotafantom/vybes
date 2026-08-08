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
 * Va rilanciato anche dopo ogni cambio di **formula**, non solo di pesi:
 * con la separazione per ruolo, tutti i punteggi in tabella sono calcolati
 * su un massimo diverso (110) da quello attuale (100).
 *
 *   npm run reputazione:ricalcola
 *   npm run reputazione:ricalcola -- --prova     (mostra e non scrive)
 */
import { prisma } from "../src/lib/prisma";
import { calcolaReputazione } from "../src/lib/reputazione";
import { fattiDi } from "../src/lib/reputazione-server";

const prova = process.argv.includes("--prova");

async function main() {
  // Solo l'identita': i fatti li legge `fattiDi()`, che e' la stessa funzione
  // usata dalla dashboard e dal ricalcolo automatico.
  //
  // Questa `select` era una terza copia della stessa domanda al database, ed
  // e' proprio dove si rompeva: aggiungendo le voci dell'organizzatore, lo
  // script avrebbe continuato a leggere solo i fatti dell'artista e avrebbe
  // scritto in tabella un punteggio diverso da quello mostrato in pagina.
  // Due numeri entrambi plausibili e nessuno che li confronta: e' la forma di
  // difetto piu' difficile da scoprire.
  //
  // Il prezzo e' una query per account invece di una sola. Su una directory
  // di qualche centinaio di profili, lanciata a mano dopo un cambio di pesi,
  // e' un prezzo che si paga volentieri per non avere due verita'.
  const utenti = await prisma.user.findMany({
    select: { id: true, name: true, role: true, reputation: true },
    orderBy: { createdAt: "asc" },
  });

  let cambiati = 0;
  let saliti = 0;
  let scesi = 0;

  for (const u of utenti) {
    const letto = await fattiDi(u.id);
    if (!letto) continue;

    const nuova = calcolaReputazione(letto.fatti, letto.role);
    if (nuova === u.reputation) continue;

    cambiati += 1;
    if (nuova > u.reputation) saliti += 1;
    else scesi += 1;

    console.log(
      `${u.name.padEnd(24).slice(0, 24)} ${u.role.padEnd(9)} ` +
        `${String(u.reputation).padStart(4)} \u2192 ${String(nuova).padStart(4)}`
    );

    if (!prova) {
      await prisma.user.update({ where: { id: u.id }, data: { reputation: nuova } });
    }
  }

  console.log(
    `\n${utenti.length} account \u00b7 ${cambiati} da aggiornare (${saliti} in salita, ${scesi} in discesa)` +
      (prova ? "\nNiente \u00e8 stato scritto: rilancia senza --prova per applicare." : "\nFatto.")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

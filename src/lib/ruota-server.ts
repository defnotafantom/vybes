import { prisma } from "@/lib/prisma";
import { giornoDi } from "@/lib/vetrina";
import { premioDi, type Premio } from "@/lib/ruota";

/**
 * La ruota, lato server: cosa la apre, e cosa succede quando gira.
 */

/**
 * Ha fatto qualcosa oggi?
 *
 * ── Perché non basta essere entrato ──
 *
 * Vedi `ruota.ts`: una ruota che gira per il solo fatto di aver aperto il sito
 * premia chi ha tempo; una che si sblocca facendo qualcosa premia chi fa
 * funzionare il mercato. Qui si decide cosa conta come «qualcosa».
 *
 * ── Cosa conta, e perché proprio queste quattro ──
 *
 * Sono le azioni che lasciano un segno per **qualcun altro**: una partita
 * mette cinque lavori davanti a chi gioca, una risposta libera qualcuno che
 * aspettava, un lavoro caricato riempie una pagina pubblica, un obiettivo
 * riscosso è la conferma di una delle tre. Nessuna di queste si può fare a
 * vuoto premendo un pulsante.
 *
 * Non contano invece aprire pagine, mettere «mi piace», seguire qualcuno:
 * costano un secondo e non producono niente, quindi sbloccherebbero la ruota
 * a chiunque passi di qui — che è la ruota gratis con un passaggio in più.
 *
 * ── Perché quattro query e non una ──
 *
 * Perché la prima che risponde «sì» chiude la questione. Le quattro sono in
 * ordine di probabilità decrescente e vengono valutate in sequenza: chi ha
 * appena giocato paga una query sola.
 */
export async function haFattoQualcosaOggi(userId: string, giorno: number): Promise<boolean> {
  const inizio = new Date(giorno * 86_400_000 - 3_600_000);

  if (await prisma.partitaOrecchio.findUnique({ where: { userId_giorno: { userId, giorno } } })) {
    return true;
  }
  if (await prisma.questProgress.findFirst({ where: { userId, riscossaIl: { gte: inizio } } })) {
    return true;
  }
  if (
    await prisma.participation.findFirst({
      where: { event: { organizerId: userId }, respondedAt: { gte: inizio } },
    })
  ) {
    return true;
  }
  return Boolean(
    await prisma.portfolioItem.findFirst({ where: { userId, createdAt: { gte: inizio } } })
  );
}

export type StatoRuota =
  | { stato: "gia-girata"; premio: Premio; monete: number }
  | { stato: "pronta" }
  | { stato: "chiusa" };

/** Cosa mostrare oggi a questa persona. */
export async function statoRuota(userId: string, giorno = giornoDi()): Promise<StatoRuota> {
  const giro = await prisma.giroRuota.findUnique({
    where: { userId_giorno: { userId, giorno } },
    select: { premio: true, monete: true },
  });

  if (giro) {
    // Il premio si ricostruisce dal seme, non si legge dalla riga: se un
    // giorno cambiassero gli spicchi, la riga vecchia continuerebbe a citare
    // una chiave che non esiste più. Ricostruendolo si mostra sempre qualcosa
    // di coerente col catalogo attuale, e il valore in monete — quello sì
    // conservato — resta il numero vero che è stato accreditato.
    return { stato: "gia-girata", premio: premioDi(userId, giorno), monete: giro.monete };
  }

  return (await haFattoQualcosaOggi(userId, giorno)) ? { stato: "pronta" } : { stato: "chiusa" };
}

export type EsitoGiro =
  | { ok: true; premio: Premio; monete: number; saldo: number; nuovoOggetto: boolean }
  | { ok: false; motivo: string };

/**
 * Gira.
 *
 * ── Perché l'ordine delle scritture è questo ──
 *
 * `GiroRuota` si crea **per prima**, dentro la transazione. È la riga con il
 * vincolo di unicità: creandola per ultima, due richieste simultanee avrebbero
 * entrambe accreditato le monete prima che la seconda venisse respinta, e la
 * transazione avrebbe annullato solo la seconda — lasciando la prima con un
 * accredito doppio a registro.
 *
 * ── Perché un oggetto già posseduto diventa monete ──
 *
 * Vincere una cornice che si ha già è un premio vuoto, e i premi vuoti
 * insegnano che girare non vale la pena. In quel caso si accredita comunque
 * un valore, e la pagina lo dice: «ce l'avevi già, ecco l'equivalente».
 */
export async function gira(userId: string, giorno = giornoDi()): Promise<EsitoGiro> {
  if (!(await haFattoQualcosaOggi(userId, giorno))) {
    return {
      ok: false,
      motivo: "La ruota si apre dopo aver fatto qualcosa qui dentro, oggi.",
    };
  }

  const premio = premioDi(userId, giorno);

  // Se il premio è un oggetto che ha già, vale il suo prezzo in monete.
  let monete = premio.monete;
  let nuovoOggetto = false;
  if (premio.cosmetico) {
    const gia = await prisma.possesso.findUnique({
      where: { userId_cosmeticoId: { userId, cosmeticoId: premio.cosmetico } },
      select: { id: true },
    });
    nuovoOggetto = !gia;
    if (gia) monete = 150;
  }

  try {
    const saldo = await prisma.$transaction(async (tx) => {
      await tx.giroRuota.create({ data: { userId, giorno, premio: premio.chiave, monete } });

      if (nuovoOggetto && premio.cosmetico) {
        await tx.possesso.create({
          data: { userId, cosmeticoId: premio.cosmetico, prezzo: 0 },
        });
      }

      if (monete > 0) {
        await tx.user.update({ where: { id: userId }, data: { monete: { increment: monete } } });
        await tx.movimentoMonete.create({
          data: { userId, delta: monete, causale: `ruota:${giorno}` },
        });
      }

      const u = await tx.user.findUnique({ where: { id: userId }, select: { monete: true } });
      return u?.monete ?? 0;
    });

    return { ok: true, premio, monete, saldo, nuovoOggetto };
  } catch {
    // L'unico errore atteso è il vincolo di unicità, e non è un guasto: è la
    // regola. Chi ricarica dopo aver girato passa di qui.
    return { ok: false, motivo: "Hai già girato oggi. La ruota torna domani." };
  }
}

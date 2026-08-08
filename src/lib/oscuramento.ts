import { prisma } from "@/lib/prisma";
import { ricalcolaReputazione } from "@/lib/reputazione-server";
import { syncPortfolioQuests } from "@/lib/gamification";
import { revalidatePath } from "next/cache";
import type { TipoSegnalabile } from "@/lib/segnalazioni";

/**
 * Rimozione di un contenuto in seguito a una segnalazione accolta.
 *
 * Accogliere una segnalazione senza toccare il contenuto è teatro: la coda si
 * svuota, il materiale resta online. La decisione e l'azione devono stare nello
 * stesso gesto, altrimenti si separano e prima o poi divergono.
 *
 * ── Perché nascondere e non cancellare ──
 *
 * Il contenuto diventa privato, non sparisce. Tre ragioni, in ordine di peso:
 *
 * 1. Una decisione di moderazione si può sbagliare, e il Digital Services Act
 *    prevede esplicitamente che sia contestabile. Un contenuto cancellato non
 *    si può ripristinare, quindi il reclamo diventerebbe una formalità senza
 *    rimedio.
 * 2. Se la segnalazione riguarda qualcosa di illecito, il contenuto è anche una
 *    prova. Distruggerla è il contrario di quello che serve.
 * 3. Chi ha pubblicato mantiene accesso al proprio materiale: la sanzione è la
 *    visibilità, non l'espropriazione.
 *
 * Per i casi in cui il contenuto va distrutto — materiale che coinvolge minori
 * — la rimozione dal database è una decisione separata e deliberata, non un
 * effetto collaterale di un pulsante nella coda.
 */

export type Oscurato = {
  /** Chi ha pubblicato: serve per la motivazione dovuta dall'art. 17 DSA. */
  autore: { id: string; name: string; email: string } | null;
  /** Come chiamare il contenuto nel messaggio all'autore. */
  descrizione: string;
};

/**
 * Nasconde il contenuto e restituisce chi l'ha pubblicato.
 *
 * `targetId` è lo slug per profili, portfolio ed eventi — che hanno un URL
 * pubblico — e l'identificativo per post e commenti, che non ce l'hanno. È la
 * stessa convenzione usata da `percorsoOggetto`.
 */
export async function oscura(
  tipo: TipoSegnalabile,
  targetId: string
): Promise<Oscurato | null> {
  switch (tipo) {
    case "USER": {
      const u = await prisma.user.update({
        where: { slug: targetId },
        data: { isPublic: false },
        select: { id: true, name: true, email: true, citySlug: true },
      });
      // Le pagine indicizzate che lo mostravano vanno rigenerate subito: senza,
      // resterebbe servito dalla cache per un'ora dopo la rimozione.
      revalidatePath(`/artisti/${targetId}`);
      revalidatePath("/artisti");
      if (u.citySlug) revalidatePath(`/citta/${u.citySlug}/artisti`);
      return { autore: u, descrizione: "il tuo profilo pubblico" };
    }

    case "PORTFOLIO": {
      const p = await prisma.portfolioItem.update({
        where: { slug: targetId },
        data: { isPublic: false },
        select: { title: true, user: { select: { id: true, name: true, email: true } } },
      });
      // Il conteggio della reputazione filtra `isPublic: true`: nascondendo un
      // lavoro, il punteggio del suo autore deve scendere. Senza questa riga
      // un profilo moderato conservava i punti di ciò che non mostra più.
      await ricalcolaReputazione(p.user.id);
      await syncPortfolioQuests(p.user.id);
      revalidatePath(`/portfolio/${targetId}`);
      return { autore: p.user, descrizione: `il lavoro «${p.title}»` };
    }

    case "EVENT": {
      const e = await prisma.event.update({
        where: { slug: targetId },
        data: { isPublic: false },
        select: {
          title: true,
          citySlug: true,
          organizer: { select: { id: true, name: true, email: true } },
        },
      });
      revalidatePath(`/eventi/${targetId}`);
      revalidatePath("/eventi");
      if (e.citySlug) revalidatePath(`/citta/${e.citySlug}`);
      return { autore: e.organizer, descrizione: `l'ingaggio «${e.title}»` };
    }

    case "POST": {
      const p = await prisma.post.update({
        where: { id: targetId },
        data: { isPublic: false },
        select: { author: { select: { id: true, name: true, email: true } } },
      });
      return { autore: p.author, descrizione: "un tuo post" };
    }

    case "COMMENT": {
      // I commenti non hanno un campo di visibilità: l'unica misura possibile
      // è la cancellazione. È un limite dello schema, non una scelta — e va
      // detto qui invece di lasciarlo scoprire a chi modera.
      const c = await prisma.comment.delete({
        where: { id: targetId },
        select: { author: { select: { id: true, name: true, email: true } } },
      });
      return { autore: c.author, descrizione: "un tuo commento" };
    }
  }
}

import { prisma } from "@/lib/prisma";

/**
 * Quanto richiede attenzione, sezione per sezione.
 *
 * Il menu dell'area personale elencava le sezioni e basta. Per sapere se
 * qualcosa era successo bisognava aprirle una per una — e siccome quasi sempre
 * non era successo niente, si smetteva di controllarle. Il risultato è che le
 * cose che aspettano una risposta restano ferme: le candidature soprattutto,
 * dove dall'altra parte c'è qualcuno che aspetta senza sapere.
 *
 * Un contatore accanto alla voce toglie il bisogno di andare a vedere. È la
 * differenza fra un menu che elenca e uno che informa.
 *
 * ── Cosa conta e cosa no ──
 *
 * Solo ciò che richiede **un'azione da parte tua**, non ciò che è semplicemente
 * nuovo. Un post nel feed non conta: non ti aspetta nessuno. Una candidatura
 * ferma sì. Un messaggio non letto sì.
 *
 * È la regola che tiene un indicatore utile: se segnala tutto, si impara a
 * ignorarlo, e allora tanto vale non averlo.
 */

export type Attenzione = {
  /** Candidature ricevute e ancora senza risposta. */
  candidature: number;
  /** Conversazioni con messaggi arrivati dopo l'ultima lettura. */
  messaggi: number;
  /** Segnalazioni aperte — solo per chi ha il ruolo. */
  segnalazioni: number;
};

export async function attenzioneDi(userId: string, moderatore: boolean): Promise<Attenzione> {
  const [candidature, conversazioni, segnalazioni] = await Promise.all([
    prisma.participation.count({
      where: { status: "PENDING", event: { organizerId: userId } },
    }),

    // Le conversazioni con almeno un messaggio più recente dell'ultima lettura.
    // `lastReadAt` nullo significa mai aperta: se ci sono messaggi, sono tutti
    // da leggere.
    prisma.conversationParticipant.findMany({
      where: { userId },
      select: {
        lastReadAt: true,
        conversation: {
          select: { messages: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
    }),

    moderatore
      ? prisma.report.count({ where: { status: { in: ["APERTA", "IN_ESAME"] } } })
      : Promise.resolve(0),
  ]);

  const messaggi = conversazioni.filter((c) =>
    nonLetta(c.lastReadAt, c.conversation.messages[0]?.createdAt)
  ).length;

  return { candidature, messaggi, segnalazioni };
}

/**
 * Una conversazione ha messaggi non letti?
 *
 * Estratta perché è l'unico punto con una logica che si può sbagliare, e i tre
 * casi limite sono tutti reali:
 *
 * - **nessun messaggio**: la conversazione esiste ma è vuota — succede quando
 *   qualcuno preme «Contatta» e poi non scrive. Non è da leggere: segnalarla
 *   manderebbe l'altra persona a cercare un messaggio che non c'è.
 * - **mai aperta** (`lastReadAt` nullo) con dei messaggi: tutti da leggere.
 * - **riaperta dopo**: si confrontano gli istanti, e il confronto è stretto —
 *   un messaggio arrivato *nello stesso* millisecondo dell'apertura è stato
 *   visto.
 */
export function nonLetta(
  lastReadAt: Date | null | undefined,
  ultimoMessaggio: Date | undefined
): boolean {
  if (!ultimoMessaggio) return false;
  if (!lastReadAt) return true;
  return ultimoMessaggio > lastReadAt;
}

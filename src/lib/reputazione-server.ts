import { prisma } from "@/lib/prisma";
import {
  calcolaReputazione,
  dettaglioReputazione,
  massimoDi,
  type FattiReputazione,
  type Voce,
} from "@/lib/reputazione";
import { cerca } from "@/lib/ruolo";

/**
 * Lettura dei fatti e ricalcolo della reputazione.
 *
 * Separato da `reputazione.ts` perché quello è puro e viene importato anche da
 * componenti client: tirarsi dietro il client Prisma da lì significherebbe
 * spedire al browser la logica di accesso al database.
 *
 * ── Perché ricalcolare e non incrementare ──
 *
 * Un punteggio incrementale diverge dalla realtà al primo caso non previsto:
 * un lavoro cancellato dal portfolio, una candidatura ritirata, un profilo
 * svuotato. Il valore resta alto e nessuno se ne accorge, perché non c'è
 * niente con cui confrontarlo.
 *
 * Ricalcolando, il punteggio è sempre una funzione dello stato attuale: se
 * cancelli metà del portfolio scende, com'è giusto. Il costo è una query in
 * più nei pochi momenti in cui quei fatti cambiano — profilo salvato,
 * portfolio modificato, candidatura accettata — e non a ogni pagina.
 */

/**
 * I fatti su cui la reputazione si calcola, in un posto solo.
 *
 * Erano due `select` identiche copiate in questo file più una terza nello
 * script di ricalcolo: tre copie della stessa domanda al database, che
 * aggiungendo le voci dell'organizzatore sarebbero diventate tre copie
 * *divergenti* — lo script avrebbe scritto un punteggio diverso da quello che
 * la dashboard mostra, e nessuno se ne sarebbe accorto perché entrambi i
 * numeri sembrano plausibili.
 *
 * ── Perché i fatti dell'organizzatore si leggono solo a lui ──
 *
 * Quota di risposta e annunci retribuiti richiedono quattro conteggi che per
 * un artista valgono sempre zero e non entrano in nessuna delle sue voci.
 * Leggerli comunque sarebbe quattro query inutili sul ruolo che è la
 * maggioranza degli iscritti, in un percorso che gira a ogni salvataggio del
 * profilo.
 */
export async function fattiDi(
  userId: string
): Promise<{ fatti: FattiReputazione; role: string } | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
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
  if (!u) return null;

  const base: FattiReputazione = {
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
    candidatureRicevute: 0,
    candidatureRisposte: 0,
    annunciPubblicati: 0,
    annunciRetribuiti: 0,
  };

  if (!cerca(u.role)) return { fatti: base, role: u.role };

  const org = await fattiOrganizzatoreDi(userId);
  return { fatti: { ...base, ...org }, role: u.role };
}

export type FattiOrganizzatore = {
  candidatureRicevute: number;
  candidatureRisposte: number;
  annunciPubblicati: number;
  annunciRetribuiti: number;
  /** Artisti distinti a cui ha detto sì. */
  artistiScelti: number;
};

/**
 * Come questa persona tratta chi le si candida.
 *
 * Esportata perché la leggono in due: la reputazione, che ne fa un punteggio,
 * e i distintivi, che ne fanno un'affermazione sulla pagina pubblica.
 * Duplicare queste cinque `where` avrebbe prodotto la solita coppia
 * divergente — un profilo che dichiara «risponde sempre» mentre il punteggio
 * dice il contrario, e nessuno dei due numeri sbagliato abbastanza da farsi
 * notare.
 */
export async function fattiOrganizzatoreDi(userId: string): Promise<FattiOrganizzatore> {
  // Le candidature ritirate dall'artista escono dal denominatore: chi si è
  // tolto di mezzo da solo non stava più aspettando una risposta, e tenerle
  // dentro punirebbe l'organizzatore per una decisione altrui.
  const daRispondere = { event: { organizerId: userId }, status: { not: "CANCELLED" } } as const;

  // Le bozze non sono pubblicate: nessun artista le ha viste, quindi non
  // dicono niente su come questa persona tratta chi si candida.
  const pubblicati = { organizerId: userId, status: { not: "DRAFT" } } as const;

  const [ricevute, risposte, annunci, retribuiti, scelti] = await Promise.all([
    prisma.participation.count({ where: daRispondere }),
    prisma.participation.count({ where: { ...daRispondere, respondedAt: { not: null } } }),
    prisma.event.count({ where: pubblicati }),
    prisma.event.count({ where: { ...pubblicati, isPaid: true } }),
    // Artisti **distinti**: chi ingaggia dieci volte la stessa band ha
    // costruito un rapporto, non una rete. Contando le candidature invece
    // delle persone, il distintivo direbbe una cosa diversa da quella che
    // sembra dire.
    prisma.participation
      .groupBy({
        by: ["userId"],
        where: { status: "ACCEPTED", event: { organizerId: userId } },
      })
      .then((righe) => righe.length),
  ]);

  return {
    candidatureRicevute: ricevute,
    candidatureRisposte: risposte,
    annunciPubblicati: annunci,
    annunciRetribuiti: retribuiti,
    artistiScelti: scelti,
  };
}

export async function ricalcolaReputazione(userId: string): Promise<number> {
  const letto = await fattiDi(userId);
  if (!letto) return 0;

  const reputation = calcolaReputazione(letto.fatti, letto.role);
  await prisma.user.update({ where: { id: userId }, data: { reputation } });
  return reputation;
}

/**
 * Il dettaglio da mostrare in dashboard, calcolato sugli stessi fatti.
 *
 * Torna anche il massimo invece di lasciarlo ricavare a chi chiama: dipende da
 * quali voci sono misurabili per *questa* persona, e ricavarlo altrove
 * sarebbero due modi di calcolare lo stesso denominatore.
 */
export async function dettaglioReputazioneDi(
  userId: string
): Promise<{ voci: Voce[]; massimo: number }> {
  const letto = await fattiDi(userId);
  if (!letto) return { voci: [], massimo: 0 };

  const voci = dettaglioReputazione(letto.fatti, letto.role);
  return { voci, massimo: massimoDi(voci) };
}

import { prisma } from "@/lib/prisma";
import { PROFILO_PUBBLICO, ARTISTA_PUBBLICO } from "@/lib/visibilita";
import { giornoDi, inVetrina } from "@/lib/vetrina";
import {
  componiTurno,
  punteggio,
  settimanaDi,
  primoGiornoDi,
  DOMANDE_PER_TURNO,
  MINIMO_ARTISTI,
  type Domanda,
  type Lavoro,
} from "@/lib/orecchio";

/**
 * Il turno del giorno letto dal database, e la sua correzione.
 *
 * ── La regola che regge tutto questo file ──
 *
 * **Le risposte non escono mai da qui.** Il client riceve le domande senza
 * soluzione, rimanda le proprie scelte, e il punteggio lo ricalcola il server
 * ricostruendo lo stesso turno dallo stesso seme.
 *
 * Non è prudenza generica: mandare le soluzioni al browser «tanto sono in un
 * gioco» significa che la classifica la vince chi apre gli strumenti di
 * sviluppo, e una classifica che si può vincere così smette di significare
 * qualcosa per tutti gli altri — compresi quelli che non sanno nemmeno che si
 * possa fare.
 *
 * È anche il motivo per cui il turno è deterministico: potendolo ricostruire
 * dal solo numero del giorno, il server non deve conservare da nessuna parte
 * quali domande ha spedito, e non c'è nessuna sessione di gioco che possa
 * scadere, perdersi o essere manomessa.
 */

/**
 * Quanti lavori si pescano dal database per comporre il turno.
 *
 * Più dei cinque che servono, perché `componiTurno` ne scarta parecchi: al
 * massimo un lavoro per artista, e i lavori senza autore utilizzabile. Ottanta
 * è abbondante e resta una query sola.
 */
const CANDIDATI = 80;

/**
 * Quanti artisti entrano nella rotazione del gioco.
 *
 * ── Perché una rotazione e non tutti ──
 *
 * Con l'intera directory a disposizione, i tre distrattori di ogni domanda
 * sarebbero pescati fra centinaia di nomi e sarebbero sempre facce nuove:
 * chi gioca non imparerebbe nessun nome, li vedrebbe scorrere. Con una
 * rotazione stretta, gli stessi artisti tornano per qualche giorno e poi
 * lasciano il posto — che è esattamente il modo in cui un nome si impara.
 *
 * È la stessa forma della vetrina (ADR-044): **una fila, non un podio**. Si
 * entra per anzianità d'iscrizione, i posti sono pochi, e il turno arriva a
 * tutti. Non si compra, come niente di ciò che è visibilità (ADR-047): se un
 * giorno si potesse pagare per essere ascoltati, il gioco diventerebbe un
 * cartellone e chi gioca smetterebbe di fidarsi di quello che sente.
 */
const POSTI_ROTAZIONE = 24;

export type TurnoPubblico = {
  giorno: number;
  /** Le domande senza soluzione: è tutto ciò che il client può sapere. */
  domande: { lavoro: Domanda["lavoro"]; opzioni: Domanda["opzioni"] }[];
  massimo: number;
};

/**
 * Ricostruisce il turno di un giorno. Deterministico: stesso giorno, stesso
 * turno, anche a mesi di distanza.
 */
export async function turnoDi(giorno: number): Promise<Domanda[]> {
  // Gli artisti in rotazione oggi, dalla stessa fila della vetrina ma con la
  // propria larghezza: qui i posti sono ventiquattro perché servono quattro
  // nomi per domanda, non tre schede in home.
  const tuttiArtisti = await prisma.user.findMany({
    where: ARTISTA_PUBBLICO,
    orderBy: { createdAt: "asc" },
    take: 400,
    select: { slug: true, name: true },
  });

  const rotazione = inVetrina(tuttiArtisti, POSTI_ROTAZIONE, giorno);
  if (rotazione.length < MINIMO_ARTISTI) return [];

  const slugInGara = rotazione.map((a) => a.slug);

  const lavori = await prisma.portfolioItem.findMany({
    where: {
      isPublic: true,
      user: { ...PROFILO_PUBBLICO, slug: { in: slugInGara } },
      // Un lavoro senza indirizzo non si può né ascoltare né guardare: come
      // domanda sarebbe un titolo e tre righe di descrizione, cioè un indovinello
      // sul testo invece che sull'opera.
      mediaUrl: { not: "" },
    },
    orderBy: { createdAt: "asc" },
    take: CANDIDATI,
    select: {
      slug: true,
      title: true,
      description: true,
      mediaType: true,
      mediaUrl: true,
      user: { select: { slug: true, name: true } },
    },
  });

  const perGioco: Lavoro[] = lavori.map((l) => ({
    slug: l.slug,
    titolo: l.title,
    descrizione: l.description,
    tipo: l.mediaType,
    mediaUrl: l.mediaUrl,
    artistaSlug: l.user.slug,
    artistaNome: l.user.name,
  }));

  return componiTurno({
    lavori: perGioco,
    artisti: rotazione.map((a) => ({ slug: a.slug, nome: a.name })),
    giorno,
  });
}

/** Il turno di oggi ripulito di ciò che il client non deve vedere. */
export function senzaRisposte(giorno: number, domande: Domanda[]): TurnoPubblico {
  return {
    giorno,
    // `risposta` non viene omesso con un `delete` né con uno spread negativo:
    // si ricostruisce l'oggetto campo per campo. È l'unico modo che il
    // compilatore sappia difendere — aggiungendo domani un campo sensibile a
    // `Domanda`, questo non lo lascia passare per distrazione.
    domande: domande.map((d) => ({ lavoro: d.lavoro, opzioni: d.opzioni })),
    massimo: punteggio(Array.from({ length: domande.length }, () => true)),
  };
}

export type Esito = {
  punteggio: number;
  corrette: number;
  monete: number;
  /** Le soluzioni, spedite **solo** insieme al risultato finale. */
  soluzioni: { lavoro: string; giusta: string }[];
};

/**
 * Quante monete vale una partita.
 *
 * Poche, e legate al risultato: la ruota e le quest restano la fonte
 * principale. Un gioco che paga meglio di tutto il resto sposta il centro del
 * prodotto su di sé, ed è precisamente ciò che ADR-042 voleva evitare.
 */
export function moneteDi(corrette: number): number {
  return corrette * 8 + (corrette === DOMANDE_PER_TURNO ? 20 : 0);
}

/**
 * Corregge le scelte e registra la partita.
 *
 * ── Perché la scrittura è una transazione ──
 *
 * Tre cose devono accadere insieme: la partita si registra, il saldo sale, il
 * movimento finisce a registro. Se la seconda passasse e la terza no, il saldo
 * conterrebbe monete che il registro non spiega — ed è esattamente la
 * divergenza per cui il registro esiste.
 *
 * ── Perché il doppione lo ferma il database ──
 *
 * `@@unique([userId, giorno])`. Due richieste partite nello stesso istante
 * passerebbero entrambe qualunque controllo scritto prima della scrittura: è
 * il caso classico di una gara fra due richieste, e l'unico posto che può
 * arbitrarla è il vincolo.
 */
export async function registraPartita(
  userId: string,
  giorno: number,
  scelte: (string | null)[]
): Promise<{ ok: true; esito: Esito } | { ok: false; motivo: string }> {
  const domande = await turnoDi(giorno);
  if (domande.length === 0) return { ok: false, motivo: "Oggi non c'è nessun turno." };

  // Le scelte arrivano dal client e possono essere di qualunque lunghezza:
  // si legge per posizione, e ciò che manca vale come sbagliata.
  const esiti = domande.map((d, i) => scelte[i] === d.risposta);
  const corrette = esiti.filter(Boolean).length;
  const punti = punteggio(esiti);
  const monete = moneteDi(corrette);

  try {
    await prisma.$transaction([
      prisma.partitaOrecchio.create({
        data: { userId, giorno, punteggio: punti, corrette },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { monete: { increment: monete } },
      }),
      prisma.movimentoMonete.create({
        data: { userId, delta: monete, causale: `orecchio:${giorno}` },
      }),
    ]);
  } catch {
    // L'unico errore atteso è il vincolo di unicità, e non è un guasto: è la
    // regola del gioco che dice di no. Chiunque ricarichi la pagina dopo aver
    // giocato passa di qui.
    return { ok: false, motivo: "Hai già giocato il turno di oggi. Torna domani." };
  }

  return {
    ok: true,
    esito: {
      punteggio: punti,
      corrette,
      monete,
      soluzioni: domande.map((d) => ({ lavoro: d.lavoro.slug, giusta: d.risposta })),
    },
  };
}

/** La partita di oggi, se c'è già stata. */
export async function partitaDiOggi(userId: string, giorno = giornoDi()) {
  return prisma.partitaOrecchio.findUnique({
    where: { userId_giorno: { userId, giorno } },
    select: { punteggio: true, corrette: true },
  });
}

export type RigaClassifica = {
  posizione: number;
  slug: string;
  nome: string;
  immagine: string | null;
  punti: number;
  partite: number;
};

/**
 * La classifica della settimana.
 *
 * ── Perché si azzera ──
 *
 * Una classifica perpetua la vince chi si è iscritto per primo: dopo un mese
 * il distacco è incolmabile, si vede, e nessun altro prova più. Azzerandola
 * ogni lunedì, ogni settimana c'è una gara che qualcuno può ancora vincere —
 * l'unica condizione in cui una classifica motiva chi non è già in cima.
 *
 * ── Perché si somma invece di prendere il migliore ──
 *
 * Prendendo il punteggio più alto della settimana, chi gioca una volta sola e
 * ha fortuna batte chi gioca tutti i giorni. Sommando, la costanza conta — e
 * siccome si può giocare una volta al giorno, il massimo è comunque limitato:
 * nessuno può accumulare stando sveglio la notte.
 */
export async function classificaDi(
  settimana: number,
  quanti = 20
): Promise<{ righe: RigaClassifica[]; daGiorno: number; aGiorno: number }> {
  const daGiorno = primoGiornoDi(settimana);
  const aGiorno = daGiorno + 6;

  const somme = await prisma.partitaOrecchio.groupBy({
    by: ["userId"],
    where: { giorno: { gte: daGiorno, lte: aGiorno } },
    _sum: { punteggio: true },
    _count: { _all: true },
    orderBy: { _sum: { punteggio: "desc" } },
    take: quanti,
  });

  if (somme.length === 0) return { righe: [], daGiorno, aGiorno };

  // Una query sola per i nomi invece di una per riga: `groupBy` non sa fare
  // join, e venti letture separate in un percorso che gira a ogni apertura
  // della pagina sono venti volte troppe.
  const utenti = await prisma.user.findMany({
    where: { id: { in: somme.map((s) => s.userId) } },
    select: { id: true, slug: true, name: true, image: true },
  });
  const perId = new Map(utenti.map((u) => [u.id, u]));

  const righe = somme
    .map((s, i) => {
      const u = perId.get(s.userId);
      if (!u) return null;
      return {
        posizione: i + 1,
        slug: u.slug,
        nome: u.name,
        immagine: u.image,
        punti: s._sum.punteggio ?? 0,
        partite: s._count._all,
      };
    })
    .filter((r): r is RigaClassifica => r !== null)
    // Le posizioni si rinumerano dopo aver scartato gli account spariti: senza
    // questo, una classifica potrebbe cominciare dal secondo posto.
    .map((r, i) => ({ ...r, posizione: i + 1 }));

  return { righe, daGiorno, aGiorno };
}

/** La settimana corrente, per chi non vuole importare due moduli. */
export function settimanaCorrente(): number {
  return settimanaDi(giornoDi());
}

/**
 * «L'orecchio»: la sfida quotidiana, e perché esiste.
 *
 * ── Perché un sito per ingaggiare musicisti ha un gioco ──
 *
 * La risposta sbagliata sarebbe «per trattenere le persone». Un quiz trattiene
 * chi è venuto per il quiz, e ADR-042 aveva già stabilito che non è quello il
 * problema di ritorno di questo prodotto: un artista non riapre il sito perché
 * c'è un gioco, lo riapre perché qualcuno lo ha contattato.
 *
 * La risposta vera è che **il gioco è un canale di distribuzione travestito da
 * gioco**. Ogni domanda mostra un lavoro reale di un artista iscritto e chiede
 * di indovinare di chi è. Chi gioca cinque domande al giorno, dopo una
 * settimana conosce trentacinque lavori e i nomi di chi li ha fatti. È la
 * forma di visibilità più economica che questo sito possa produrre: nessun
 * budget, nessun posto in home da assegnare, e chi la riceve non ha pagato
 * niente.
 *
 * Il criterio di ADR-042 — *ogni premio deve rendere l'artista più facile da
 * ingaggiare* — qui è soddisfatto dal gioco stesso, non dal premio.
 *
 * ── Perché il turno è deciso dal giorno e non dal caso ──
 *
 * Perché c'è una classifica, e una classifica su domande diverse per ognuno
 * non è una classifica: è un elenco di persone che hanno giocato a giochi
 * diversi. Con lo stesso seme per tutti, il confronto significa qualcosa —
 * ed è anche l'unico modo in cui «oggi era difficile» diventa una frase che si
 * può dire a qualcun altro.
 *
 * Il seme è il numero del giorno. Nessuno stato da conservare, nessun turno da
 * generare in anticipo con un lavoro pianificato: la stessa data dà lo stesso
 * turno per sempre, anche ricalcolandolo a distanza di mesi.
 *
 * ── Perché sta qui, puro ──
 *
 * Perché è l'unica logica del gioco che si può sbagliare in silenzio: un turno
 * con la risposta giusta assente fra le opzioni non solleva nessun errore,
 * dà solo una partita che nessuno può vincere.
 */

import { giornoDi } from "@/lib/vetrina";

/** Quante domande in un turno. */
export const DOMANDE_PER_TURNO = 5;

/** Quante risposte fra cui scegliere. */
export const POSSIBILITA = 4;

/**
 * Quanti artisti distinti servono perché il gioco abbia senso.
 *
 * Con tre artisti e quattro opzioni, una delle opzioni si ripete e la domanda
 * si risolve senza ascoltare niente. Sotto questa soglia il gioco non si
 * apre: dire «torna quando ci saranno più artisti» è meno peggio che offrire
 * una partita truccata.
 */
export const MINIMO_ARTISTI = POSSIBILITA;

/**
 * Un generatore pseudocasuale con seme, in quattro righe.
 *
 * `Math.random()` non ha seme, quindi non può produrre un turno riproducibile.
 * Mulberry32 è il più corto che passi i controlli statistici che servono qui —
 * e qui servono pochissimo: si tratta di mescolare otto elementi, non di
 * crittografia. Scritto a mano perché una dipendenza per quattro righe che si
 * leggono in dieci secondi è un costo che non si ripaga.
 */
function generatore(seme: number): () => number {
  let a = seme >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mescola una copia, senza toccare l'originale.
 *
 * Fisher-Yates. La copia non è pignoleria: mescolando sul posto, l'elenco dei
 * lavori arrivato dal database cambierebbe ordine sotto ai piedi di chi lo ha
 * passato, e il difetto si manifesterebbe altrove.
 */
export function mescola<T>(elenco: readonly T[], rnd: () => number): T[] {
  const copia = [...elenco];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export type Lavoro = {
  slug: string;
  titolo: string;
  descrizione: string | null;
  tipo: string;
  mediaUrl: string;
  /** L'autore: è la risposta. */
  artistaSlug: string;
  artistaNome: string;
};

export type Domanda = {
  lavoro: Omit<Lavoro, "artistaSlug" | "artistaNome">;
  /** I nomi fra cui scegliere, già mescolati. */
  opzioni: { slug: string; nome: string }[];
  /** Lo slug dell'autore vero. */
  risposta: string;
};

/**
 * Il turno di oggi, uguale per tutti.
 *
 * ── Le due garanzie che le prove difendono ──
 *
 * 1. La risposta giusta è **sempre** fra le opzioni. Sembra ovvio, ma è la
 *    cosa che si rompe per prima mescolando: basta mescolare le opzioni dopo
 *    aver memorizzato l'indice della risposta invece dello slug.
 * 2. Nessun lavoro compare due volte nello stesso turno, e nessun artista
 *    compare due volte fra le opzioni della stessa domanda — due voci uguali
 *    rendono la domanda insolubile a chi indovina giusto.
 *
 * ── Perché i distrattori sono altri artisti veri ──
 *
 * Perché sbagliare deve comunque insegnare un nome. Con nomi inventati la
 * domanda sarebbe più facile e non lascerebbe niente; con artisti veri, ogni
 * risposta — giusta o sbagliata — mette quattro persone davanti a chi gioca.
 */
export function componiTurno({
  lavori,
  artisti,
  giorno = giornoDi(),
  quante = DOMANDE_PER_TURNO,
  possibilita = POSSIBILITA,
}: {
  lavori: readonly Lavoro[];
  /** Tutti gli artisti selezionabili come risposta, autori inclusi. */
  artisti: readonly { slug: string; nome: string }[];
  giorno?: number;
  quante?: number;
  possibilita?: number;
}): Domanda[] {
  if (artisti.length < possibilita || lavori.length === 0) return [];

  const rnd = generatore(giorno);

  // Un lavoro per artista al massimo: due domande sullo stesso autore nello
  // stesso turno rendono la seconda un tiro a segno, perché il nome è appena
  // stato letto.
  const visti = new Set<string>();
  const candidati = mescola(lavori, rnd).filter((l) => {
    if (visti.has(l.artistaSlug)) return false;
    visti.add(l.artistaSlug);
    return true;
  });

  return candidati.slice(0, quante).map((l) => {
    const distrattori = mescola(
      artisti.filter((a) => a.slug !== l.artistaSlug),
      rnd
    ).slice(0, possibilita - 1);

    const opzioni = mescola([{ slug: l.artistaSlug, nome: l.artistaNome }, ...distrattori], rnd);

    return {
      lavoro: {
        slug: l.slug,
        titolo: l.titolo,
        descrizione: l.descrizione,
        tipo: l.tipo,
        mediaUrl: l.mediaUrl,
      },
      opzioni,
      // Lo slug, non l'indice. Memorizzando l'indice, il mescolamento qui
      // sopra sposterebbe la risposta e nessun tipo se ne accorgerebbe.
      risposta: l.artistaSlug,
    };
  });
}

// ─────────────────────────────── PUNTEGGIO ───────────────────────────────

/** Punti per una risposta esatta, prima del moltiplicatore della serie. */
export const PUNTI_BASE = 100;

/**
 * Il tetto del moltiplicatore.
 *
 * Senza tetto, un turno perfetto varrebbe 100+200+300+400+500 = 1500 contro i
 * 100 di chi ne indovina una sola: una classifica in cui il primo ha quindici
 * volte il punteggio dell'ultimo smette di essere una gara e diventa un
 * annuncio.
 *
 * Con il tetto a 2,5 il turno perfetto vale 950 — un fattore nove e mezzo
 * invece di quindici. Premia ancora nettamente la costanza, ma lascia in vista
 * chi ha sbagliato una domanda, che è la sola parte della classifica in cui
 * qualcuno ha ancora motivo di riprovare domani.
 */
export const SERIE_MASSIMA = 2.5;

/**
 * Il punteggio di un turno, da una sequenza di esiti.
 *
 * La serie moltiplica: la seconda esatta di fila vale più della prima. È
 * l'unica meccanica del gioco che premia l'attenzione invece della fortuna —
 * indovinare a caso una domanda su quattro capita, indovinarne cinque di fila
 * a caso capita una volta su mille.
 *
 * Un errore azzera la serie ma **non toglie punti**: sottrarre punteggiando
 * spingerebbe a non rispondere quando non si sa, e una domanda saltata non
 * mostra il lavoro a nessuno — che è tutto il motivo per cui il gioco esiste.
 */
export function punteggio(esiti: readonly boolean[]): number {
  let totale = 0;
  let serie = 0;

  for (const esatta of esiti) {
    if (!esatta) {
      serie = 0;
      continue;
    }
    serie += 1;
    const moltiplicatore = Math.min(SERIE_MASSIMA, 1 + (serie - 1) * 0.5);
    totale += Math.round(PUNTI_BASE * moltiplicatore);
  }

  return totale;
}

/** Il massimo ottenibile in un turno di questa lunghezza. */
export function punteggioMassimo(quante = DOMANDE_PER_TURNO): number {
  return punteggio(Array.from({ length: quante }, () => true));
}

// ─────────────────────────────── CLASSIFICA ───────────────────────────────

/**
 * La settimana di un giorno, come numero.
 *
 * ── Perché la classifica si azzera ──
 *
 * Una classifica perpetua la vince chi si è iscritto per primo: dopo un mese
 * il distacco è incolmabile, si vede, e nessun altro prova più. Azzerandola
 * ogni lunedì, ogni settimana c'è una gara che qualcuno può ancora vincere —
 * che è l'unica condizione in cui una classifica motiva chi non è già in cima.
 *
 * Il giorno 0 di `giornoDi()` è il 1° gennaio 1970, un **giovedì**. Sottrarre
 * 4 porta l'inizio della settimana al lunedì precedente; senza quella
 * correzione le settimane si azzererebbero di giovedì, che non è sbagliato ma
 * è inspiegabile.
 */
export function settimanaDi(giorno: number = giornoDi()): number {
  return Math.floor((giorno - 4) / 7);
}

/** Il primo giorno della settimana indicata. */
export function primoGiornoDi(settimana: number): number {
  return settimana * 7 + 4;
}

/** Quanti giorni mancano alla fine della settimana corrente, oggi incluso. */
export function giorniAllaFine(giorno: number = giornoDi()): number {
  return primoGiornoDi(settimanaDi(giorno) + 1) - giorno;
}

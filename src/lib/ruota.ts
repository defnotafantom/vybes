/**
 * La ruota giornaliera: cosa distribuisce, e perché non gira gratis.
 *
 * ── Perché si sblocca facendo qualcosa ──
 *
 * Una ruota che gira per il solo fatto di aver aperto il sito premia chi ha
 * tempo. La stessa ruota, che si sblocca **avendo fatto una cosa** — una
 * partita a «L'orecchio», una risposta a chi si è candidato, un lavoro
 * caricato — premia chi fa funzionare il mercato, e trasforma il ritorno
 * quotidiano da tempo passato in lavoro fatto. La meccanica è identica, il
 * comportamento che produce è opposto (ADR-047, ADR-049).
 *
 * Il costo di questa scelta è reale e va detto: chi apre il negozio e trova la
 * ruota chiusa resta deluso. Per questo la ruota **dice sempre cosa la apre**,
 * con il collegamento accanto — e l'azione più breve dura due minuti.
 *
 * ── Perché l'esito è deciso dal seme e non dal caso ──
 *
 * Con `Math.random()` sul server, una richiesta interrotta a metà — rete che
 * cade, pagina ricaricata — lascerebbe la persona senza premio e senza modo di
 * sapere quale fosse. Con un seme costruito su *chi* e *quando*, il risultato
 * di oggi è già deciso prima che qualcuno prema: rilanciare la stessa
 * richiesta dà lo stesso esito, e non c'è nessun modo di girare finché non
 * esce quello buono.
 *
 * È la stessa idea del turno de «L'orecchio», applicata a una cosa sola.
 */

import { cosmeticoDi, type Cosmetico } from "@/lib/cosmetici";

export type Premio = {
  chiave: string;
  etichetta: string;
  /** Monete assegnate. Zero se il premio è un oggetto. */
  monete: number;
  /** Id di un cosmetico del catalogo, se il premio è quello. */
  cosmetico?: string;
  /**
   * Quanto è probabile, in parti su `TOTALE_PESI`. Non una percentuale: con le
   * percentuali si sbaglia la somma e nessuno se ne accorge, perché il codice
   * normalizzerebbe comunque. Con i pesi interi la somma è una prova.
   */
  peso: number;
  /** La tinta dello spicchio: il valore si legge anche a colpo d'occhio. */
  tinta: string;
};

/**
 * Gli spicchi.
 *
 * ── Perché nessuno è vuoto ──
 *
 * «Non hai vinto niente» è la casella più comune in quasi tutte le ruote, ed è
 * un errore: insegna che girare non vale la pena, e la volta dopo non si gira.
 * Qui il premio minimo è basso ma esiste sempre. La differenza fra il minimo e
 * il massimo — dieci contro duecento — è abbastanza per far sperare, e nessuno
 * se ne va a mani vuote.
 *
 * ── Perché i pesi sono così ──
 *
 * Il valore atteso di un giro è **53 monete** — misurato, non stimato: la
 * prova in `tests/unit/ruota.test.ts` gira ventimila volte e confronta le
 * frequenze con i pesi dichiarati. Circa quanto una partita ben giocata a
 * «L'orecchio», e molto meno di una quest.
 *
 * La ruota è il contorno, non il piatto: se pagasse meglio del resto
 * sposterebbe il centro del prodotto su di sé, che è ciò che ADR-042 voleva
 * evitare. È anche il motivo per cui si gira una volta sola al giorno — il
 * tetto è più efficace di un premio piccolo, perché non toglie l'attesa.
 */
export const SPICCHI: readonly Premio[] = [
  { chiave: "m10", etichetta: "10 monete", monete: 10, peso: 30, tinta: "#64748b" },
  { chiave: "m25", etichetta: "25 monete", monete: 25, peso: 26, tinta: "#06b6d4" },
  { chiave: "m50", etichetta: "50 monete", monete: 50, peso: 20, tinta: "#8b5cf6" },
  { chiave: "m100", etichetta: "100 monete", monete: 100, peso: 12, tinta: "#ec4899" },
  { chiave: "m200", etichetta: "200 monete", monete: 200, peso: 6, tinta: "#f59e0b" },
  {
    chiave: "cornice",
    etichetta: "Una cornice",
    monete: 0,
    cosmetico: "cornice-vetro",
    peso: 6,
    tinta: "#a78bfa",
  },
] as const;

export const TOTALE_PESI = SPICCHI.reduce((s, p) => s + p.peso, 0);

/**
 * Il generatore con seme, lo stesso de «L'orecchio».
 *
 * Duplicato in due righe invece che importato: `orecchio.ts` è il gioco, non
 * una libreria di utilità, e farlo diventare l'uno o l'altro per quattro righe
 * legherebbe la ruota a un modulo che non c'entra. Se un giorno servisse a un
 * terzo posto, allora avrà senso estrarlo — non prima.
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

/** Un numero dal testo, per costruire un seme che dipenda da chi gira. */
function semeDa(testo: string): number {
  let h = 2166136261;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Cosa esce a questa persona, oggi.
 *
 * Deterministico su `(userId, giorno)`: lo stesso giro dà sempre lo stesso
 * premio, e giorni diversi danno premi diversi. Chi ricarica non cambia esito,
 * e un premio contestato si può ricalcolare a distanza di mesi.
 */
export function premioDi(userId: string, giorno: number): Premio {
  const rnd = generatore(semeDa(`${userId}:${giorno}`));
  let scelta = rnd() * TOTALE_PESI;

  for (const p of SPICCHI) {
    scelta -= p.peso;
    if (scelta < 0) return p;
  }
  // Irraggiungibile finché i pesi sono positivi, ma un ripiego esplicito vale
  // più di un `!` che promette al compilatore qualcosa che non può verificare.
  return SPICCHI[0];
}

/** L'oggetto del catalogo, se il premio ne assegna uno. */
export function cosmeticoDelPremio(p: Premio): Cosmetico | undefined {
  return p.cosmetico ? cosmeticoDi(p.cosmetico) : undefined;
}

/**
 * Cosa apre la ruota, in parole.
 *
 * Le voci stanno qui e non nella pagina perché la stessa frase deve comparire
 * sulla ruota chiusa e nel messaggio dell'API che la rifiuta: due elenchi
 * scritti a mano divergerebbero, e chi legge il secondo andrebbe a fare una
 * cosa che il primo non conta.
 */
export const COME_SI_APRE = [
  { testo: "Gioca una partita a «L'orecchio»", href: "/dashboard/minigiochi/orecchio" },
  { testo: "Riscuoti un obiettivo completato", href: "/dashboard/quest" },
  { testo: "Rispondi a chi si è candidato", href: "/dashboard/eventi" },
  { testo: "Carica un lavoro nel portfolio", href: "/dashboard/portfolio" },
] as const;

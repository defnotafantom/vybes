/**
 * Piccole regole della lingua italiana che il sito ripete ovunque.
 *
 * ── Perché esiste ──
 *
 * «1 ARTISTI» sulla pagina delle città, «1 messaggi» in cima a una
 * conversazione. Lo stesso errore, due volte, in produzione, su due pagine
 * scritte a mesi di distanza — e in altri sei punti del sito la stessa frase
 * era invece scritta giusta, con un ternario a mano.
 *
 * È il difetto ricorrente di questo progetto nella sua forma più piccola: la
 * regola esiste, la conosciamo tutti, e niente la applica. Finché concordare
 * il plurale è **facoltativo**, ogni conteggio nuovo è un'altra occasione di
 * sbagliare; e a chi legge «1 messaggi» non comunica un bug, comunica che
 * dietro non c'è nessuno che guarda.
 */

/**
 * Un conteggio col suo sostantivo concordato: `conta(1, "messaggio",
 * "messaggi")` → «1 messaggio».
 *
 * Zero prende il plurale, che in italiano è la forma giusta — «0 messaggi» —
 * e non richiede quindi un terzo caso.
 */
export function conta(n: number, singolare: string, plurale: string): string {
  return `${n} ${n === 1 ? singolare : plurale}`;
}

/**
 * Solo il sostantivo concordato, senza il numero.
 *
 * Serve dove il numero è già in pagina con un suo stile — grande, tabellare,
 * in una colonna di statistiche — e ripeterlo nella riga sotto lo
 * duplicherebbe.
 */
export function concorda(n: number, singolare: string, plurale: string): string {
  return n === 1 ? singolare : plurale;
}

/**
 * L'incontro: una cosa al giorno che nessuno ha chiesto.
 *
 * ── Il problema, e perché una enciclopedia non lo risolve ──
 *
 * Chi non conosce un'arte non la cerca — non si cerca una cosa di cui si
 * ignora l'esistenza. E chi crede di conoscerla la cerca con l'idea sbagliata
 * che ha già. Una pagina «Cucito: storia e tradizione» risolve il problema
 * della **ricerca**; qui si affronta quello dell'**incontro**, che viene prima
 * e che è quello che conta (POSIZIONE.md).
 *
 * Il meccanismo ha due ingredienti, e nessuno dei due è opzionale:
 *
 * 1. **Esposizione senza impegno.** Una cosa sola, che si guarda in dieci
 *    secondi e non chiede niente. Non un catalogo da esplorare: un catalogo
 *    da esplorare presuppone che tu sappia già cosa stai cercando.
 * 2. **Contraddizione dello stereotipo.** L'opera compare accanto alla frase
 *    che la smentisce, scritta dall'artista. Senza quella frase l'opera è solo
 *    una foto: bella o brutta, ma senza il gancio che tocca chi guarda.
 *
 * ── Perché solo le opere che hanno una credenza ──
 *
 * Perché senza quella frase questo non è un incontro, è una vetrina. La
 * selezione è severa di proposito: meglio ruotare su poche opere che diluire
 * la cosa fino a farla diventare un feed.
 *
 * ── Perché deterministico per giorno ──
 *
 * Perché «una al giorno» dev'essere vero. Ricaricando la pagina esce la stessa
 * opera: se cambiasse a ogni giro diventerebbe uno scorrimento infinito, cioè
 * esattamente la cosa che POSIZIONE.md dichiara di non voler essere. E la
 * stessa proprietà rende la pagina memorizzabile nella cache per tutto il
 * giorno — la scelta di prodotto e quella tecnica coincidono.
 *
 * Chi ha una sessione ha una rotazione propria: due persone lo stesso giorno
 * incontrano opere diverse, altrimenti la copertura di un catalogo di
 * cinquecento opere sarebbe di trecentosessantacinque all'anno.
 */

/**
 * Un generatore pseudocasuale con seme.
 *
 * Mulberry32, la stessa di `orecchio.ts`. Non è stata estratta in un modulo
 * condiviso e la ragione è che le due copie non devono cambiare insieme: se
 * un giorno la rotazione del gioco venisse ritoccata, l'incontro non deve
 * seguirla. Quattro righe duplicate valgono meno di un accoppiamento fra due
 * cose che non hanno motivo di essere accoppiate.
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
 * Da testo a numero, con FNV-1a.
 *
 * Serve solo a spalmare identificatori diversi su semi diversi: due utenti con
 * `id` che si somigliano devono ricevere opere scorrelate. Non è una funzione
 * crittografica e non deve esserlo — se qualcuno indovinasse quale opera gli
 * uscirà domani, non avrebbe ottenuto niente.
 */
export function semeDa(testo: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Il minimo indispensabile di un'opera per poter essere incontrata. */
export type OperaIncontrabile = {
  id: string;
  slug: string;
  titolo: string;
  credenza: string;
  mediaUrl: string;
  mediaType: string;
  disciplina: string | null;
  autore: { nome: string; slug: string };
};

/**
 * Sotto quante opere la rotazione non ha senso.
 *
 * Con meno di tre, «una al giorno» diventa «sempre la stessa»: chi torna il
 * secondo giorno vede quello che ha già visto e capisce che non c'è niente
 * dietro. Meglio non mostrare affatto la sezione — uno stato vuoto onesto vale
 * più di una rotazione finta.
 */
export const MINIMO_OPERE = 3;

/**
 * L'opera di oggi, per questa persona.
 *
 * `chi` è vuoto per chi non ha la sessione: tutti gli anonimi incontrano la
 * stessa opera nello stesso giorno, ed è voluto — è anche l'unico modo perché
 * la pagina pubblica sia una sola e memorizzabile nella cache.
 *
 * ── Perché un salto e non un indice ──
 *
 * `giorno % lunghezza` sembra la cosa ovvia e ha un difetto: aggiungendo
 * un'opera al catalogo, l'intera sequenza futura di tutti si sposta di uno.
 * Con un passo pseudocasuale scelto dal seme, l'ordine di ognuno resta il
 * proprio e il catalogo può crescere sotto senza rimescolare il mondo.
 */
export function operaDelGiorno<T>(opere: readonly T[], giorno: number, chi = ""): T | null {
  if (opere.length === 0) return null;
  const rnd = generatore(semeDa(`${chi}|incontro`));
  // Un punto di partenza e un passo, entrambi dal seme della persona. Il passo
  // e' dispari per costruzione: con la lunghezza pari, un passo pari
  // visiterebbe solo meta' del catalogo e l'altra meta' resterebbe invisibile
  // per sempre.
  const inizio = Math.floor(rnd() * opere.length);
  const passo = 1 + 2 * Math.floor(rnd() * Math.max(1, Math.floor(opere.length / 2)));
  return opere[(inizio + giorno * passo) % opere.length] ?? null;
}

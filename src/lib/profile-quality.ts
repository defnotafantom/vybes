import { fromCsv } from "@/lib/slug";

/**
 * Soglia di qualità per l'indicizzazione dei profili.
 *
 * La difesa anti thin-content esisteva solo per le pagine di elenco — le
 * combinazioni città×disciplina, che sono centinaia e nascono quasi tutte
 * vuote. I profili individuali non avevano alcun filtro: bastava registrarsi
 * e verificare l'email per finire in sitemap.
 *
 * Il risultato si è visto in produzione. Fra i nove profili dichiarati a
 * Google c'erano `kkkk` e `il-tuo-nome`: account di prova, pagine senza una
 * riga di contenuto, presentate come indicizzabili sul tipo di pagina su cui
 * poggia tutta la strategia di ricerca. Per un dominio nuovo è il danno
 * peggiore possibile: la valutazione iniziale si costruisce su ciò che trova
 * la prima scansione.
 *
 * Il rimedio non è cancellare a mano quei due account. Sarebbe una pulizia
 * che va rifatta ogni settimana, e che dipende da qualcuno che se ne ricordi.
 * La regola sta nel codice, e i profili vuoti restano fuori da soli.
 */

/**
 * Lunghezza minima della biografia perché conti come contenuto.
 *
 * Centoventi caratteri sono circa venti parole: sotto quella soglia il testo
 * non aggiunge nulla a ciò che il risultato di ricerca mostra già nel titolo
 * e nello snippet. "Cantante" non è una biografia.
 */
export const MIN_BIO = 120;

export type ProfileSubstance = {
  bio: string | null;
  /** Discipline in formato CSV, come sono sul database. */
  disciplines: string;
  /** Quanti elementi di portfolio pubblici ha il profilo. */
  portfolioCount: number;
};

/**
 * Un profilo merita di stare in sitemap e nell'indice?
 *
 * Due condizioni, entrambe necessarie:
 *
 * 1. **Almeno una disciplina.** Senza, la pagina non risponde a nessuna
 *    ricerca: nessuno cerca "un artista", si cerca "un chitarrista a Bologna".
 *    È il dato che collega il profilo a una domanda reale.
 *
 * 2. **Una biografia sostanziosa oppure almeno un lavoro nel portfolio.**
 *    La pagina deve offrire qualcosa che il risultato di ricerca non mostra
 *    già da sé. Un nome e una città stanno interamente nello snippet: aprire
 *    la pagina non aggiungerebbe niente, ed è esattamente la definizione
 *    operativa di thin content.
 *
 * Le due alternative del secondo punto non sono intercambiabili per caso: un
 * musicista si racconta scrivendo, un fotografo mostrando. Pretendere
 * entrambe escluderebbe metà delle discipline per un requisito formale.
 */
export function isProfileIndexable(p: ProfileSubstance): boolean {
  if (fromCsv(p.disciplines).length === 0) return false;

  const bio = (p.bio ?? "").trim();
  return bio.length >= MIN_BIO || p.portfolioCount > 0;
}

/**
 * Cosa manca a questo profilo per essere indicizzabile.
 *
 * Serve alla dashboard: dire a un artista "il tuo profilo non compare su
 * Google" senza spiegargli perché è inutile. Restituisce un elenco vuoto se
 * il profilo è a posto.
 */
export function missingForIndex(p: ProfileSubstance): string[] {
  const mancanze: string[] = [];

  if (fromCsv(p.disciplines).length === 0) {
    mancanze.push("Indica almeno una disciplina");
  }

  const bio = (p.bio ?? "").trim();
  if (bio.length < MIN_BIO && p.portfolioCount === 0) {
    mancanze.push(
      bio.length === 0
        ? "Scrivi una biografia di almeno venti parole, oppure carica un lavoro nel portfolio"
        : `Allunga la biografia (${bio.length} caratteri su ${MIN_BIO}), oppure carica un lavoro nel portfolio`
    );
  }

  return mancanze;
}

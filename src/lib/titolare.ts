/**
 * I dati del titolare del trattamento, in un posto solo.
 *
 * ── Perché esiste questo file ──
 *
 * Erano scritti come segnaposto dentro il testo di `/privacy` e `/termini`:
 * due pagine, quattro punti diversi, evidenziati in giallo. Il rischio non è
 * dimenticarne uno — è compilarne tre su quattro e credere di aver finito,
 * perché il giallo residuo sta a metà di una pagina lunga che nessuno rilegge.
 *
 * Qui il dato sta in un punto solo, e le pagine lo leggono. Compilare significa
 * modificare questo file e basta.
 *
 * ── Perché non una variabile d'ambiente ──
 *
 * Sarebbe la scelta istintiva, ed è sbagliata per due motivi. Questi dati non
 * sono un segreto: compaiono per intero su una pagina pubblica, che è
 * esattamente il loro scopo. E soprattutto sono un **contenuto legale
 * versionato**: sapere da quando l'informativa dichiarava un certo titolare è
 * il genere di cosa che serve proprio quando c'è una contestazione, e la
 * cronologia di git è l'unico posto in cui quella risposta esiste.
 *
 * ── Cosa succede finché non è compilato ──
 *
 * Le pagine mostrano l'avviso che sono incomplete. Non è una decorazione: un
 * documento che dichiara i propri buchi è più onesto di uno che li nasconde, e
 * chi arriva capisce che il servizio non è ancora aperto davvero.
 */

export const TITOLARE = {
  /** Nome e cognome, oppure ragione sociale se c'è una società. */
  nome: "Daniele Mirko Bucca",
  /** Indirizzo completo: via, numero, CAP, città, provincia. */
  indirizzo: "Via Croce, 12, 98051, Barcellona Pozzo di Gotto (ME), Italia",
  /** Partita IVA se c'è, altrimenti codice fiscale. */
  fiscale: "BCCDLM00M22A638L",
  /**
   * Indirizzo email per l'esercizio dei diritti (artt. 15-22 GDPR) e per le
   * comunicazioni relative ai termini.
   *
   * Meglio un indirizzo dedicato, tipo `privacy@vybeshub.art`, che uno
   * personale: finisce su una pagina pubblica e indicizzata, quindi lo
   * raccoglieranno anche i sistemi automatici che cercano indirizzi.
   */
  email: "privacy.vybes@gmail.com",
  /**
   * Città del foro competente nei termini di servizio.
   *
   * Di norma quella di residenza o della sede: è dove si radicherebbe una
   * causa. Resta comunque salvo il foro del consumatore, che la legge non
   * consente di derogare — ed è già scritto nei termini.
   */
  foro: "Barcellona Pozzo di Gotto",
} as const;

/**
 * L'informativa è completa?
 *
 * Usato dalle pagine legali per decidere se mostrare l'avviso. Basta un campo
 * vuoto: un titolare senza indirizzo o senza contatto non è identificabile, e
 * un'informativa che non identifica il titolare non è opponibile a nessuno.
 */
export function titolareCompleto(): boolean {
  return Object.values(TITOLARE).every((v) => v.trim().length > 0);
}

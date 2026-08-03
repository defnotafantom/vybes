/**
 * I distintivi di un profilo: cosa questa persona ha dimostrato.
 *
 * ── Perché esistono, e perché non sono trofei ──
 *
 * Sono la forma che la gamification prende su questo sito (ADR-042). Si
 * collezionano come i cosmetici di un gioco — sono pochi, alcuni difficili,
 * e vedere quelli che mancano fa venire voglia di prenderli — ma la ricompensa
 * non è un oggetto: è **credibilità presso chi assume**.
 *
 * Da qui tre vincoli che li distinguono da un sistema di trofei:
 *
 * 1. **Stanno sulla pagina pubblica.** Un premio che vede solo chi lo ha
 *    vinto è un premio per il tempo passato sul sito, che è precisamente ciò
 *    che questo progetto ha deciso di non ricompensare.
 * 2. **Derivano da fatti verificabili**, mai da attività. Nessun distintivo
 *    si ottiene aprendo il sito tutti i giorni, pubblicando molto o
 *    scrivendo a tanta gente: quelle sono cose che si possono simulare, e che
 *    a un organizzatore non dicono niente.
 * 3. **Ognuno risponde a una domanda che un organizzatore si pone davvero**
 *    prima di scrivere a uno sconosciuto. È il criterio con cui accettare o
 *    rifiutare un distintivo nuovo: se non risponde a nessuna di quelle
 *    domande, non va aggiunto — per quanto sia divertente.
 *
 * ── Perché sono pochi ──
 *
 * Venti distintivi diventano una parete di icone che nessuno legge, e il
 * profilo comincia a somigliare a un cruscotto invece che a una persona. Sei
 * sono già al limite: la scarsità è quello che li rende desiderabili, ed è
 * anche quello che li rende leggibili.
 *
 * ── Perché niente livelli d'oro e d'argento ──
 *
 * Perché introdurrebbero una scala, e una scala accanto a un nome è un voto —
 * la cosa che ADR-039 ha tolto dalle pagine pubbliche per ragioni che valgono
 * ancora. Un distintivo c'è o non c'è.
 */

export type FattiDistintivi = {
  isVerified: boolean;
  createdAt: Date;
  /** Candidature accettate da un organizzatore. */
  ingaggiConfermati: number;
  /** Ingaggi pubblicati e portati a termine. */
  ingaggiOrganizzati: number;
  /** Lavori pubblici nel portfolio. */
  portfolio: number;
  /** Il profilo ha città e almeno una disciplina dichiarata. */
  raggiungibile: boolean;
};

export type Distintivo = {
  chiave: string;
  etichetta: string;
  /** Cosa dice a chi legge il profilo. Compare come descrizione accessibile. */
  significato: string;
  /** Cosa serve per ottenerlo, per chi ancora non ce l'ha. */
  come: string;
  ottenuto: boolean;
};

/** Da quanti ingaggi confermati scatta il distintivo. */
export const SOGLIA_INGAGGIATO = 3;
/** Da quanti ingaggi organizzati e conclusi. */
export const SOGLIA_ORGANIZZATORE = 2;
/** Quanti lavori servono perché il portfolio conti come completo. */
export const SOGLIA_PORTFOLIO = 5;

export function distintiviDi(f: FattiDistintivi): Distintivo[] {
  const anno = f.createdAt.getFullYear();

  return [
    {
      chiave: "verificato",
      etichetta: "Identità verificata",
      // La domanda: «questa persona è chi dice di essere?». È la prima che si
      // fa chi sta per far salire uno sconosciuto su un palco che paga.
      significato: "Abbiamo avuto un riscontro diretto su chi è questa persona.",
      come: "La assegniamo noi ai profili di cui abbiamo un riscontro.",
      ottenuto: f.isVerified,
    },
    {
      chiave: "ingaggiato",
      etichetta: `Scelto ${SOGLIA_INGAGGIATO} volte`,
      // La domanda: «qualcun altro l'ha già ingaggiato?». È il segnale più
      // forte del sito, perché è l'unico che non dipende da chi lo riceve:
      // lo assegna qualcun altro, con i propri soldi.
      significato: `Almeno ${SOGLIA_INGAGGIATO} organizzatori hanno accettato una sua candidatura.`,
      come: "Si ottiene facendosi scegliere: non c'è modo di prenderlo da soli.",
      ottenuto: f.ingaggiConfermati >= SOGLIA_INGAGGIATO,
    },
    {
      chiave: "organizzatore",
      etichetta: "Organizza e porta a termine",
      // La domanda vale per l'altro lato: «se mi candido a una sua serata, si
      // farà davvero?».
      significato: `Ha pubblicato e concluso almeno ${SOGLIA_ORGANIZZATORE} ingaggi.`,
      come: "Pubblica i tuoi annunci e portali fino in fondo.",
      ottenuto: f.ingaggiOrganizzati >= SOGLIA_ORGANIZZATORE,
    },
    {
      chiave: "portfolio",
      etichetta: "Portfolio completo",
      // La domanda: «posso sentirlo prima di decidere?».
      significato: `Ha pubblicato almeno ${SOGLIA_PORTFOLIO} lavori da guardare o ascoltare.`,
      come: `Carica ${SOGLIA_PORTFOLIO} lavori nel portfolio.`,
      ottenuto: f.portfolio >= SOGLIA_PORTFOLIO,
    },
    {
      chiave: "raggiungibile",
      etichetta: "Facile da trovare",
      // La domanda: «lo trovo quando cerco quello che mi serve, dove mi
      // serve?». Sembra il più debole dei cinque, ed è quello che decide se
      // gli altri quattro verranno mai visti da qualcuno.
      significato: "Ha dichiarato città e disciplina: compare nelle ricerche locali.",
      come: "Indica la tua città e almeno una disciplina nel profilo.",
      ottenuto: f.raggiungibile,
    },
    {
      chiave: "dal",
      etichetta: `Su Vybes dal ${anno}`,
      // Non è un merito, ed è di proposito l'unico così: dice da quanto una
      // persona è in giro, che è un dato che chi legge sa interpretare da sé.
      // Si "ottiene" iscrivendosi, quindi non compare mai fra quelli mancanti.
      significato: `Ha aperto il profilo nel ${anno}.`,
      come: "",
      ottenuto: true,
    },
  ];
}

/** Quelli conquistati, nell'ordine in cui vale la pena leggerli. */
export function distintiviOttenuti(f: FattiDistintivi): Distintivo[] {
  return distintiviDi(f).filter((d) => d.ottenuto);
}

/**
 * Quelli che mancano, per la propria area personale.
 *
 * «Su Vybes dal…» non compare mai qui: non è un obiettivo, e mostrarlo fra le
 * cose da fare suggerirebbe che ci sia un modo di ottenerlo prima.
 */
export function distintiviMancanti(f: FattiDistintivi): Distintivo[] {
  return distintiviDi(f).filter((d) => !d.ottenuto && d.come !== "");
}

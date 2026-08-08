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

  // ── I fatti di chi ingaggia ──
  // Zero per un artista, e non entrano in nessuno dei suoi distintivi.
  /** Candidature ricevute sui propri annunci, escluse le ritirate. */
  candidatureRicevute: number;
  /** Di quelle, quante hanno avuto una risposta — sì o no, purché una. */
  candidatureRisposte: number;
  /** Annunci pubblicati, bozze escluse. */
  annunciPubblicati: number;
  /** Di quelli, quanti dichiarano un compenso. */
  annunciRetribuiti: number;
  /** Artisti **distinti** a cui ha detto sì. */
  artistiScelti: number;
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

/**
 * Le soglie di chi ingaggia.
 *
 * Più alte di quelle dell'artista, e di proposito. Un distintivo su un profilo
 * di artista dice «guardami»; su un profilo di organizzatore dice a qualcun
 * altro «fidati, candidati qui» — e se poi quella persona non riceve risposta,
 * il danno l'ha fatto il distintivo. Concederli tardi costa poco; concederli
 * presto costa la fiducia di chi ci ha creduto.
 */
export const SOGLIA_RISPOSTE = 5; // candidature ricevute prima di poterlo dire
export const QUOTA_RISPOSTE = 0.9; // quante devono aver avuto risposta
export const SOGLIA_ANNUNCI = 3; // annunci pubblicati prima di poterlo dire
export const QUOTA_RETRIBUITI = 0.8; // quanti devono dichiarare un compenso
export const SOGLIA_SCELTI = 5; // artisti distinti ingaggiati

function distintiviArtista(f: FattiDistintivi, anno: number): Distintivo[] {
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
    anzianita(anno),
  ];
}

/**
 * Non è un merito, ed è di proposito l'unico così: dice da quanto una persona
 * è in giro, che è un dato che chi legge sa interpretare da sé. Si "ottiene"
 * iscrivendosi, quindi non compare mai fra quelli mancanti.
 */
function anzianita(anno: number): Distintivo {
  return {
    chiave: "dal",
    etichetta: `Su Vybes dal ${anno}`,
    significato: `Ha aperto il profilo nel ${anno}.`,
    come: "",
    ottenuto: true,
  };
}

function quota(parte: number, tutto: number): number {
  return tutto > 0 ? parte / tutto : 0;
}

/**
 * I distintivi di chi ingaggia.
 *
 * ── Perché ne servivano di propri ──
 *
 * L'elenco era uno solo, e quattro voci su sei un organizzatore non può
 * ottenerle: non ha un portfolio, non dichiara discipline, non viene scelto da
 * nessuno. Sulla sua pagina pubblica restavano due pillole — «identità
 * verificata» e l'anno d'iscrizione — cioè quasi niente, proprio nel punto in
 * cui un artista sta decidendo se candidarsi a uno sconosciuto.
 *
 * ── Il criterio, ribaltato ──
 *
 * Per l'artista la domanda era *cosa dice a un organizzatore che è una scelta
 * sicura?*. Qui è: **cosa dice a un artista che vale la pena candidarsi qui?**
 * Ogni voce risponde a una paura precisa di chi sta per scrivere a un locale
 * che non conosce — e sono le tre paure vere: non mi risponderà, non mi
 * pagherà, la serata salterà.
 */
function distintiviOrganizzatore(f: FattiDistintivi, anno: number): Distintivo[] {
  const abbastanzaCandidature = f.candidatureRicevute >= SOGLIA_RISPOSTE;
  const abbastanzaAnnunci = f.annunciPubblicati >= SOGLIA_ANNUNCI;

  return [
    {
      chiave: "verificato",
      etichetta: "Identità verificata",
      significato: "Abbiamo avuto un riscontro diretto su chi è questa persona.",
      come: "La assegniamo noi ai profili di cui abbiamo un riscontro.",
      ottenuto: f.isVerified,
    },
    {
      chiave: "risponde",
      etichetta: "Risponde sempre",
      // La paura numero uno: «scrivo e sparisce». È il distintivo più
      // difficile da tenere — basta smettere di rispondere e se ne va — ed è
      // giusto così: dichiara un comportamento presente, non un merito
      // passato.
      significato: `Ha risposto a quasi tutte le candidature ricevute (almeno ${SOGLIA_RISPOSTE}).`,
      come: "Rispondi a chi si candida: anche un no vale, purché arrivi.",
      ottenuto: abbastanzaCandidature && quota(f.candidatureRisposte, f.candidatureRicevute) >= QUOTA_RISPOSTE,
    },
    {
      chiave: "paga",
      etichetta: "Annunci retribuiti",
      // La paura numero due. Non punisce chi pubblica anche qualcosa di non
      // retribuito — una jam, un laboratorio — ma distingue chi paga quasi
      // sempre da chi non paga mai.
      significato: `Quasi tutti i suoi annunci dichiarano un compenso (su almeno ${SOGLIA_ANNUNCI} pubblicati).`,
      come: "Indica il compenso negli annunci: quelli senza ricevono molte meno candidature.",
      ottenuto: abbastanzaAnnunci && quota(f.annunciRetribuiti, f.annunciPubblicati) >= QUOTA_RETRIBUITI,
    },
    {
      chiave: "organizzatore",
      etichetta: "Porta a termine",
      // La paura numero tre: «mi conferma e poi la serata salta».
      significato: `Ha pubblicato e concluso almeno ${SOGLIA_ORGANIZZATORE} ingaggi.`,
      come: "Segna come conclusi gli ingaggi che si sono svolti.",
      ottenuto: f.ingaggiOrganizzati >= SOGLIA_ORGANIZZATORE,
    },
    {
      chiave: "scelti",
      etichetta: `Ha ingaggiato ${SOGLIA_SCELTI} artisti`,
      // Artisti **distinti**: chi chiama dieci volte la stessa band ha
      // costruito un rapporto, non una rete. Contando le candidature
      // accettate, questo distintivo direbbe una cosa diversa da quella che
      // sembra dire.
      significato: `Ha scelto almeno ${SOGLIA_SCELTI} artisti diversi fra chi si è candidato.`,
      come: "Si ottiene ingaggiando: conta quante persone diverse hai scelto.",
      ottenuto: f.artistiScelti >= SOGLIA_SCELTI,
    },
    anzianita(anno),
  ];
}

/**
 * I distintivi di questa persona, secondo il suo ruolo.
 *
 * Un ruolo sconosciuto ricade sull'artista, come ovunque: una stringa
 * inattesa in colonna non deve svuotare la pagina di qualcuno.
 */
export function distintiviDi(f: FattiDistintivi, role: string = "ARTIST"): Distintivo[] {
  const anno = f.createdAt.getFullYear();
  return role === "RECRUITER" ? distintiviOrganizzatore(f, anno) : distintiviArtista(f, anno);
}

/** Quelli conquistati, nell'ordine in cui vale la pena leggerli. */
export function distintiviOttenuti(f: FattiDistintivi, role?: string): Distintivo[] {
  return distintiviDi(f, role).filter((d) => d.ottenuto);
}

/**
 * Quelli che mancano, per la propria area personale.
 *
 * «Su Vybes dal…» non compare mai qui: non è un obiettivo, e mostrarlo fra le
 * cose da fare suggerirebbe che ci sia un modo di ottenerlo prima.
 */
export function distintiviMancanti(f: FattiDistintivi, role?: string): Distintivo[] {
  return distintiviDi(f, role).filter((d) => !d.ottenuto && d.come !== "");
}

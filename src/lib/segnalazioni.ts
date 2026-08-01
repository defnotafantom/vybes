/**
 * Segnalazione di contenuti — il meccanismo di "notice and action" richiesto
 * dal Digital Services Act.
 *
 * L'obbligo non è proporzionato alla dimensione della piattaforma: vale anche
 * con dieci utenti. Chi ospita contenuti caricati da terzi deve permettere a
 * chiunque di segnalare materiale illecito, trattare le segnalazioni «in modo
 * tempestivo, diligente, non arbitrario e obiettivo», e comunicare la decisione
 * a chi ha segnalato.
 *
 * Le tre parole che contano sono *non arbitrario e obiettivo*: significa che
 * serve un elenco chiuso di motivi, che la decisione va motivata e che la
 * motivazione va conservata. Un modulo a testo libero senza traccia della
 * decisione non soddisfa la norma nemmeno se qualcuno legge davvero le
 * segnalazioni.
 */

/** Cosa si può segnalare. */
export const TIPI_SEGNALABILI = ["USER", "POST", "PORTFOLIO", "EVENT", "COMMENT"] as const;
export type TipoSegnalabile = (typeof TIPI_SEGNALABILI)[number];

/**
 * I motivi.
 *
 * Elenco chiuso e non testo libero: rende le decisioni confrontabili e
 * permette di dare priorità. `ALTRO` esiste perché nessun elenco copre tutto,
 * ma richiede una descrizione — altrimenti sarebbe una segnalazione vuota che
 * qualcuno deve comunque leggere.
 */
export const MOTIVI = {
  MINORI: {
    label: "Contenuto che coinvolge minori",
    aiuto: "Materiale sessuale o di sfruttamento che riguarda persone minorenni.",
    urgente: true,
  },
  ILLEGALE: {
    label: "Attività illegale",
    aiuto: "Vendita di beni o servizi vietati, truffe, contenuti che violano la legge.",
    urgente: true,
  },
  ODIO: {
    label: "Odio o discriminazione",
    aiuto: "Attacchi rivolti a persone per etnia, religione, genere, orientamento, disabilità.",
    urgente: true,
  },
  MOLESTIE: {
    label: "Molestie o minacce",
    aiuto: "Aggressioni verso una persona specifica, minacce, diffusione di dati privati.",
    urgente: true,
  },
  SESSUALE: {
    label: "Contenuto sessuale esplicito",
    aiuto: "Materiale non adatto a una directory pubblica e indicizzata.",
    urgente: false,
  },
  IMPERSONAZIONE: {
    label: "Si spaccia per qualcun altro",
    aiuto: "Un profilo che finge di essere una persona o un gruppo reale.",
    urgente: false,
  },
  PROPRIETA_INTELLETTUALE: {
    label: "Violazione di copyright",
    aiuto: "Musica, foto o testi usati senza averne diritto.",
    urgente: false,
  },
  SPAM: {
    label: "Spam o profilo falso",
    aiuto: "Contenuto ripetitivo, pubblicità mascherata, account creato a scopo promozionale.",
    urgente: false,
  },
  ALTRO: {
    label: "Altro",
    aiuto: "Qualcosa che non rientra nei casi sopra. Spiega cosa, altrimenti non possiamo valutarla.",
    urgente: false,
  },
} as const;

export type Motivo = keyof typeof MOTIVI;
export const MOTIVI_VALIDI = Object.keys(MOTIVI) as Motivo[];

export const STATI = ["APERTA", "IN_ESAME", "ACCOLTA", "RESPINTA"] as const;
export type StatoSegnalazione = (typeof STATI)[number];

/**
 * Una segnalazione va guardata prima delle altre?
 *
 * I quattro motivi urgenti sono quelli in cui il ritardo fa danno mentre il
 * contenuto resta online. Lo spam può aspettare mezza giornata; materiale che
 * coinvolge minori no.
 */
export function eUrgente(motivo: Motivo): boolean {
  return MOTIVI[motivo].urgente;
}

/**
 * Ordina la coda: prima le urgenti, poi le più vecchie.
 *
 * Il secondo criterio non è un dettaglio. Ordinando solo per urgenza, una
 * segnalazione non urgente arrivata per prima resterebbe in fondo per sempre
 * ogni volta che ne arriva una urgente: è la definizione di attesa indefinita,
 * ed è l'opposto del «trattamento tempestivo» che la norma richiede.
 */
export function ordinaCoda<T extends { reason: string; createdAt: Date }>(segnalazioni: T[]): T[] {
  return [...segnalazioni].sort((a, b) => {
    const ua = eUrgente(a.reason as Motivo) ? 0 : 1;
    const ub = eUrgente(b.reason as Motivo) ? 0 : 1;
    if (ua !== ub) return ua - ub;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Il percorso pubblico dell'oggetto segnalato.
 *
 * Serve a chi modera per andare a vedere di cosa si parla. Commenti e post non
 * hanno una pagina propria: si rimanda al profilo di chi li ha scritti, che è
 * il contesto più vicino disponibile.
 */
export function percorsoOggetto(tipo: TipoSegnalabile, id: string): string | null {
  switch (tipo) {
    case "USER":
      return `/artisti/${id}`;
    case "PORTFOLIO":
      return `/portfolio/${id}`;
    case "EVENT":
      return `/eventi/${id}`;
    case "POST":
    case "COMMENT":
      return null;
  }
}

/** Etichetta leggibile del tipo, per la coda di moderazione. */
export const ETICHETTE_TIPO: Record<TipoSegnalabile, string> = {
  USER: "Profilo",
  POST: "Post",
  PORTFOLIO: "Portfolio",
  EVENT: "Ingaggio",
  COMMENT: "Commento",
};

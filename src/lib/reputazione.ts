import { fromCsv } from "@/lib/slug";
import { ruoloDi, type Ruolo } from "@/lib/ruolo";

/**
 * La reputazione, e perché è stata rifatta due volte.
 *
 * ── Il primo problema: misurava l'attività ──
 *
 * `reputation` ordina la directory pubblica: `/artisti` fa
 * `orderBy: [{ reputation: "desc" }]`. È quindi il campo che decide chi vede
 * per primo un organizzatore che cerca un chitarrista a Bologna — la
 * posizione più preziosa di tutto il prodotto.
 *
 * Ma si guadagnava completando quest: pubblica un post, carica cinque lavori,
 * scrivi un post di collaborazione. Tradotto: la directory era ordinata per
 * *quanto hai usato il sito*, non per quanto sei affidabile. Chi passa un
 * pomeriggio a completare obiettivi scavalca un musicista bravo che si è
 * iscritto e ha caricato tre pezzi.
 *
 * Da lì la regola che regge tutto il file: la reputazione non si accumula, si
 * **calcola** da fatti verificabili e si ricalcola quando quei fatti cambiano.
 * Ogni voce ha un tetto e misura uno stato, non un conteggio di azioni:
 * nessuno può alzarla facendo qualcosa di ripetitivo.
 *
 * ── Il secondo problema: era la formula di un ruolo solo ──
 *
 * Le voci erano otto e uguali per tutti. Tre — discipline, portfolio, ingaggi
 * confermati — un organizzatore non può ottenerle: non ha un portfolio, non
 * dichiara discipline, non viene scelto da nessuno. Quarantacinque punti su
 * centodieci strutturalmente fuori portata, cioè un tetto al 59% per sempre,
 * su un numero presentato come misura di affidabilità. E la scheda che lo
 * spiega gli diceva «carica fino a cinque lavori: è quello che convince
 * davvero», a una persona che di lavori non ne ha e non ne avrà.
 *
 * Un punteggio che condanna metà degli iscritti alla mediocrità e li consiglia
 * su cose che non li riguardano non è un punteggio: è un difetto travestito da
 * misura. Ed era il lato che paga a subirlo.
 *
 * ── La scelta: due formule, stesso massimo ──
 *
 * Ogni ruolo ha le sue voci, e in entrambi i casi il totale possibile è **100**.
 * Il massimo uguale non è estetica: rende il numero confrontabile fra i due
 * lati — «ottanta» significa la stessa cosa per un artista e per un locale — e
 * toglie di mezzo la percentuale calcolata su denominatori diversi, che è il
 * modo più facile di mentire con un progresso.
 *
 * La domanda che sceglie le voci resta una sola, ribaltata per ruolo:
 *
 * - per l'artista: *cosa direbbe a un organizzatore che questa persona è una
 *   scelta sicura?*
 * - per l'organizzatore: *cosa direbbe a un artista che vale la pena
 *   candidarsi qui?*
 *
 * La risposta alla seconda è quasi tutta in una cosa, ed è per questo che pesa
 * un quarto del totale: **risponde alle candidature**. Candidarsi nel vuoto è
 * la peggiore esperienza che questo prodotto possa offrire a un artista, e chi
 * non risponde la infligge in silenzio — nessuno se ne accorge, perché non
 * succede niente.
 *
 * ── Cosa resta all'XP ──
 *
 * Il livello continua a salire con l'attività, e va bene: è un progresso
 * personale, sta nell'area privata, e non decide niente per gli altri.
 */

export type FattiReputazione = {
  emailVerified: Date | null;
  isVerified: boolean;
  bio: string | null;
  headline: string | null;
  image: string | null;
  citySlug: string | null;
  disciplines: string;
  /** Lavori pubblici nel portfolio. */
  portfolio: number;
  /** Candidature accettate da un organizzatore: lavoro vero, non attività. */
  ingaggiConfermati: number;
  /** Ingaggi pubblicati e portati a termine, per chi organizza. */
  ingaggiOrganizzati: number;
  /** Candidature ricevute sui propri annunci, escluse quelle ritirate. */
  candidatureRicevute: number;
  /** Di quelle, quante hanno avuto una risposta — sì o no, purché una. */
  candidatureRisposte: number;
  /** Annunci pubblicati, bozze escluse. */
  annunciPubblicati: number;
  /** Di quelli, quanti dichiarano un compenso. */
  annunciRetribuiti: number;
};

/**
 * Una voce del punteggio, con il suo tetto.
 *
 * `misurabile: false` è diverso da zero punti, e la differenza conta: zero
 * significa «non l'hai fatto», non misurabile significa «non c'è ancora
 * abbastanza per dirlo». Un organizzatore appena iscritto non ha ricevuto
 * candidature: dargli zero su venticinque lo dichiarerebbe inaffidabile per un
 * fatto che non è mai avvenuto, e il rimedio suggerito — «rispondi» — sarebbe
 * irrealizzabile.
 *
 * Le voci non misurabili escono dal totale **e** dal massimo. Il punteggio
 * resta quindi una frazione onesta di ciò che di quella persona si sa.
 */
export type Voce = {
  label: string;
  punti: number;
  max: number;
  come: string;
  misurabile?: boolean;
};

/**
 * Gli scaglioni della biografia, dal più alto.
 *
 * A scaglioni e non lineare: la differenza fra zero e duecento caratteri è
 * enorme, fra ottocento e mille non significa niente.
 *
 * Sono esportati perché il modulo del profilo li dice a chi scrive, mentre
 * scrive. Erano un'espressione condizionale scritta a mano qui dentro, e il
 * contatore accanto al campo avrebbe dovuto ricopiarne i numeri: due copie
 * della stessa regola divergono alla prima modifica, ed è il modo in cui su
 * questo progetto sono nati metà dei difetti.
 */
export const SCAGLIONI_BIO = [
  { da: 400, punti: 15 },
  { da: 200, punti: 10 },
  { da: 120, punti: 5 },
] as const;

/** Il tetto pieno della biografia, quello degli scaglioni qui sopra. */
const TETTO_BIO = 15;

/**
 * Punti della biografia per una lunghezza in caratteri, su un tetto dato.
 *
 * Il tetto dell'organizzatore è più basso — la sua biografia conta meno di
 * quanto risponde — quindi gli scaglioni vanno **riscalati**, non troncati:
 * troncando, duecento e quattrocento caratteri darebbero lo stesso punteggio e
 * la soglia più alta sparirebbe senza che nessuno lo sappia.
 */
export function puntiBio(caratteri: number, tetto: number = TETTO_BIO): number {
  const pieno = SCAGLIONI_BIO.find((s) => caratteri >= s.da)?.punti ?? 0;
  return Math.round((pieno / TETTO_BIO) * tetto);
}

/**
 * Quanto pesa rispondere, per quota di candidature a cui si è risposto.
 *
 * A scaglioni con un salto netto in cima: fra il 90% e il 100% la differenza
 * per chi si candida è nulla — in entrambi i casi ci si aspetta una risposta —
 * mentre fra il 50% e il 70% è la differenza fra «forse» e «probabilmente».
 *
 * Sotto la metà vale zero e non un valore piccolo: un organizzatore che ignora
 * più della metà di chi gli scrive non merita mezzo credito su questa voce,
 * perché è esattamente il comportamento che il punteggio esiste per
 * scoraggiare.
 */
export const SCAGLIONI_RISPOSTE = [
  { da: 0.9, punti: 25 },
  { da: 0.7, punti: 18 },
  { da: 0.5, punti: 10 },
] as const;

/**
 * Quante candidature servono prima di poter dire qualcosa.
 *
 * Con una sola candidatura la quota è 0% o 100%: un numero che salta fra i due
 * estremi al primo evento non misura una persona, misura il caso.
 */
export const MINIMO_CANDIDATURE = 3;

/** Sotto questa soglia di annunci, la quota di quelli retribuiti dice poco. */
export const MINIMO_ANNUNCI = 2;

function quota(parte: number, tutto: number): number {
  return tutto > 0 ? parte / tutto : 0;
}

/** Le voci comuni ai due ruoli: chi sei, e se sei chi dici di essere. */
function vociComuni(f: FattiReputazione, tettoProfilo: number): Voce[] {
  const campiProfilo = [f.headline, f.image, f.citySlug].filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ).length;

  return [
    {
      label: "Indirizzo confermato",
      punti: f.emailVerified ? 10 : 0,
      max: 10,
      come: "Conferma l'email dal link che ti abbiamo inviato.",
    },
    {
      label: "Identità verificata",
      punti: f.isVerified ? 15 : 0,
      max: 15,
      come: "La verifica la assegniamo noi ai profili di cui abbiamo riscontro.",
    },
    {
      label: "Profilo compilato",
      // Tre campi in parti uguali: foto, headline, città. Sono le tre cose che
      // compaiono nella scheda in elenco, cioè quello che si vede prima di
      // decidere se aprire il profilo.
      punti: Math.round((campiProfilo / 3) * tettoProfilo),
      max: tettoProfilo,
      come: "Aggiungi foto, presentazione in una riga e città.",
    },
  ];
}

/** Le voci di chi vuole essere trovato. */
function vociArtista(f: FattiReputazione): Voce[] {
  const bio = (f.bio ?? "").trim().length;
  const discipline = fromCsv(f.disciplines).length;

  return [
    ...vociComuni(f, 15),
    {
      label: "Biografia",
      punti: puntiBio(bio, 15),
      max: 15,
      come: "Racconta chi sei in almeno quattrocento caratteri.",
    },
    {
      label: "Discipline dichiarate",
      punti: Math.min(2, discipline) * 5,
      max: 10,
      come: "Indica una o due discipline: sono quelle su cui ti si cerca.",
    },
    {
      label: "Portfolio",
      // Tetto a cinque lavori: il sesto non dice niente in più a chi guarda, e
      // senza tetto basterebbe caricare venti file per scavalcare chiunque.
      punti: Math.min(5, f.portfolio) * 3,
      max: 15,
      come: "Carica fino a cinque lavori: è quello che convince davvero.",
    },
    {
      label: "Ingaggi confermati",
      // Vale il doppio di tutto il resto per unità, ed è l'unica voce che non
      // dipende da te: la assegna qualcun altro scegliendoti. È il segnale più
      // difficile da falsificare, quindi il più prezioso.
      punti: Math.min(4, f.ingaggiConfermati) * 5,
      max: 20,
      come: "Candidati e fatti scegliere: è il segnale che pesa di più.",
    },
  ];
}

/** Le voci di chi cerca: cosa dice a un artista che vale la pena candidarsi. */
function vociOrganizzatore(f: FattiReputazione): Voce[] {
  const bio = (f.bio ?? "").trim().length;
  const abbastanzaCandidature = f.candidatureRicevute >= MINIMO_CANDIDATURE;
  const abbastanzaAnnunci = f.annunciPubblicati >= MINIMO_ANNUNCI;

  const tassoRisposta = quota(f.candidatureRisposte, f.candidatureRicevute);
  const tassoRetribuiti = quota(f.annunciRetribuiti, f.annunciPubblicati);
  const ferme = f.candidatureRicevute - f.candidatureRisposte;

  return [
    ...vociComuni(f, 10),
    {
      label: "Chi sei",
      punti: puntiBio(bio, 10),
      max: 10,
      come: "Descrivi il locale o il progetto: dove si suona, che pubblico, che serate.",
    },
    {
      label: "Rispondi a chi si candida",
      // Un quarto del totale: la voce più pesante delle due formule.
      //
      // Perché è il danno che questo prodotto può fare a un artista, e lo fa in
      // silenzio: chi si candida e non riceve risposta non sa se è stato
      // scartato o dimenticato, e la seconda volta non si candida più. È anche
      // l'unico comportamento che, diventando la norma, svuota il sito dal lato
      // che lo riempie di contenuti.
      //
      // Un «no» vale quanto un «sì»: qui si misura **se** rispondi, non cosa
      // rispondi. Premiare i sì spingerebbe ad accettare per punteggio.
      punti: abbastanzaCandidature
        ? SCAGLIONI_RISPOSTE.find((s) => tassoRisposta >= s.da)?.punti ?? 0
        : 0,
      max: 25,
      misurabile: abbastanzaCandidature,
      come: abbastanzaCandidature
        ? ferme > 0
          ? `Ne hai ${ferme} ancora senza risposta. Anche un no vale: chi aspetta ha bisogno di sapere.`
          : "Hai risposto a tutte. È il segnale che porta gli artisti a candidarsi di nuovo."
        : `Si misura dalla terza candidatura ricevuta: per ora ne hai ${f.candidatureRicevute}.`,
    },
    {
      label: "Ingaggi portati a termine",
      punti: Math.min(4, f.ingaggiOrganizzati) * 5,
      max: 20,
      come: "Segna come conclusi gli ingaggi che si sono svolti: è la prova che qui si lavora davvero.",
    },
    {
      label: "Annunci con compenso",
      // Non punisce chi pubblica anche annunci non retribuiti — una jam, un
      // laboratorio — ma distingue chi paga *quasi sempre* da chi non paga mai.
      punti: abbastanzaAnnunci ? (tassoRetribuiti >= 0.8 ? 10 : tassoRetribuiti >= 0.5 ? 5 : 0) : 0,
      max: 10,
      misurabile: abbastanzaAnnunci,
      come: abbastanzaAnnunci
        ? "Indica il compenso negli annunci: quelli senza ricevono molte meno candidature."
        : "Si misura dal secondo annuncio pubblicato.",
    },
  ];
}

/**
 * Il dettaglio del punteggio, per ruolo.
 *
 * Restituisce le voci e non solo il totale perché la reputazione va spiegata:
 * un numero che decide la tua posizione in una directory e di cui non dici
 * come si ottiene è indistinguibile dall'arbitrio.
 */
export function dettaglioReputazione(f: FattiReputazione, role: string): Voce[] {
  return lato(role) === "RECRUITER" ? vociOrganizzatore(f) : vociArtista(f);
}

/**
 * Su quale formula si calcola il **numero salvato** in colonna.
 *
 * ── La domanda che questo risolve ──
 *
 * Chi fa entrambe le cose ha due formule, ognuna con massimo cento. Non si
 * sommano — duecento non significherebbe niente — e non si mediano: una media
 * fra due scale diverse è un numero che non risponde a nessuna domanda.
 *
 * ── La risposta ──
 *
 * Vince quella dell'**artista**, e la ragione è una sola: `reputation` esiste
 * per ordinare `/artisti`. Il valore che ordina un elenco deve significare la
 * stessa cosa per tutti quelli che ci stanno dentro — altrimenti l'ordine non
 * vuol dire più niente, e una persona con due ruoli scavalcherebbe le altre
 * per una qualità che nell'elenco non c'entra.
 *
 * L'altra metà non si perde: la dashboard mostra **entrambe le schede**, e i
 * distintivi dell'organizzatore compaiono comunque sul profilo pubblico. Quello
 * che non si mescola è il solo numero che decide una posizione.
 */
export function lato(role: string): "ARTIST" | "RECRUITER" {
  const ruolo: Ruolo = ruoloDi(role);
  return ruolo === "RECRUITER" ? "RECRUITER" : "ARTIST";
}

/** Solo ciò che di questa persona si può davvero misurare oggi. */
export function vociMisurabili(voci: Voce[]): Voce[] {
  return voci.filter((v) => v.misurabile !== false);
}

/** Il totale. */
export function calcolaReputazione(f: FattiReputazione, role: string): number {
  return vociMisurabili(dettaglioReputazione(f, role)).reduce((somma, v) => somma + v.punti, 0);
}

/**
 * Il massimo su cui questa persona è valutata oggi.
 *
 * Dipende dalle voci e non è una costante, perché quelle non ancora misurabili
 * non devono comparire nel denominatore: mostrare «40/100» a un organizzatore
 * iscritto ieri gli attribuirebbe un giudizio su fatti mai avvenuti.
 */
export function massimoDi(voci: Voce[]): number {
  return vociMisurabili(voci).reduce((s, v) => s + v.max, 0);
}

/**
 * Il massimo teorico di un ruolo, a voci tutte misurabili: 100 per entrambi.
 *
 * Serve alle prove, che sono l'unico posto in cui quel «100» va confrontato con
 * qualcosa. Nelle pagine si usa `massimoDi()`, perché lì conta il massimo di
 * *questa* persona.
 */
export function reputazioneMassima(role: string): number {
  return dettaglioReputazione(
    {
      emailVerified: new Date(),
      isVerified: true,
      bio: "x".repeat(400),
      headline: "x",
      image: "x",
      citySlug: "x",
      disciplines: "a,b",
      portfolio: 99,
      ingaggiConfermati: 99,
      ingaggiOrganizzati: 99,
      candidatureRicevute: 99,
      candidatureRisposte: 99,
      annunciPubblicati: 99,
      annunciRetribuiti: 99,
    },
    role
  ).reduce((s, v) => s + v.max, 0);
}

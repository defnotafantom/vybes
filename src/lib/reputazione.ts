import { fromCsv } from "@/lib/slug";

/**
 * La reputazione, e perché è stata rifatta.
 *
 * ── Il problema ──
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
 * È anche un invito allo sfruttamento: con le registrazioni aperte, il modo
 * più veloce di stare in cima diventa fare rumore.
 *
 * ── La scelta ──
 *
 * La reputazione non si accumula più: si **calcola** da fatti verificabili, e
 * si ricalcola quando quei fatti cambiano. Nessuno può alzarla facendo
 * qualcosa di ripetitivo, perché ogni voce ha un tetto e misura uno stato, non
 * un conteggio di azioni.
 *
 * I fatti sono scelti rispondendo a una domanda sola: *cosa direbbe a un
 * organizzatore che questa persona è una scelta sicura?* Non «è attiva», non
 * «ci tiene»: affidabile.
 *
 * ── Cosa resta all'XP ──
 *
 * Il livello continua a salire con l'attività, e va bene: è un progresso
 * personale, sta nell'area privata, e non decide niente per gli altri. I due
 * assi ora sono separati davvero — uno motiva chi lo guarda, l'altro informa
 * chi cerca.
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
};

/** Una voce del punteggio, con il suo tetto. */
type Voce = { label: string; punti: number; max: number; come: string };

/**
 * Il dettaglio del punteggio.
 *
 * Restituisce le voci e non solo il totale perché la reputazione va spiegata:
 * un numero che decide la tua posizione in una directory e che non dici come
 * si ottiene è indistinguibile dall'arbitrio.
 */
export function dettaglioReputazione(f: FattiReputazione): Voce[] {
  const bio = (f.bio ?? "").trim().length;
  const campiProfilo = [f.headline, f.image, f.citySlug].filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ).length;
  const discipline = fromCsv(f.disciplines).length;

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
      // Tre campi da cinque punti: foto, headline, città. Sono le tre cose
      // che compaiono nella scheda in elenco, cioè quello che un
      // organizzatore vede prima di decidere se aprire il profilo.
      punti: campiProfilo * 5,
      max: 15,
      come: "Aggiungi foto, presentazione in una riga e città.",
    },
    {
      label: "Biografia",
      // A scaglioni e non lineare: la differenza fra zero e duecento caratteri
      // è enorme, fra ottocento e mille non significa niente.
      punti: bio >= 400 ? 15 : bio >= 200 ? 10 : bio >= 120 ? 5 : 0,
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
      // dipende da te: la assegna qualcun altro scegliendoti. È il segnale
      // più difficile da falsificare, quindi il più prezioso.
      punti: Math.min(4, f.ingaggiConfermati) * 5,
      max: 20,
      come: "Candidati e fatti scegliere: è il segnale che pesa di più.",
    },
    {
      label: "Ingaggi organizzati",
      punti: Math.min(2, f.ingaggiOrganizzati) * 5,
      max: 10,
      come: "Vale per chi pubblica annunci: averne portati a termine conta.",
    },
  ];
}

/** Il totale, fra 0 e 110. */
export function calcolaReputazione(f: FattiReputazione): number {
  return dettaglioReputazione(f).reduce((somma, v) => somma + v.punti, 0);
}

/** Il massimo teorico, per mostrare la percentuale senza scriverla a mano. */
export function reputazioneMassima(): number {
  return dettaglioReputazione({
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
  }).reduce((s, v) => s + v.max, 0);
}

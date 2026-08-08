/**
 * Il catalogo dell'estetica, e il confine che non deve superare.
 *
 * ── Il rischio ──
 *
 * Una valuta interna è innocua finché resta estetica. Il giorno in cui compra
 * anche solo *un po'* di visibilità — un posto in vetrina, due punti di
 * reputazione, la precedenza in un elenco — la directory pubblica torna
 * ordinata per **quanto hai usato il sito**, che è esattamente il difetto
 * rimosso riscrivendo la reputazione. In versione peggiore, perché stavolta
 * sarebbe venduto come una funzione invece che subìto come un errore.
 *
 * E il danno non lo prende l'artista scavalcato: lo prende l'organizzatore che
 * si fida di quell'ordine per trovare un chitarrista sabato sera. Nel momento
 * in cui l'ordine è comprabile, la directory smette di servirgli — e lui è il
 * lato che tiene in piedi tutto il resto.
 *
 * ── Perché la regola non è scritta solo in un ADR ──
 *
 * Perché su questo progetto la forma di difetto più frequente è **la regola
 * che esiste e che niente applica**. Un ADR non compila. Quindi il confine è
 * un tipo: ogni slot dichiara cosa tocca, e ciò che può toccare è un'unione
 * chiusa di cose innocue. Chi un giorno volesse vendere visibilità dovrebbe
 * aggiungere un valore a `Effetto`, e a quel punto la prova in
 * `tests/unit/cosmetici.test.ts` glielo dice in faccia.
 *
 * ── Perché il catalogo sta nel codice e non nel database ──
 *
 * Come le discipline e le categorie di evento: è un elenco che modifica lo
 * sviluppatore, non un dato prodotto dagli utenti. Nel codice si versiona, si
 * rivede in una pull request, e soprattutto **si può provare**: l'invariante
 * qui sopra è verificabile a ogni build, mentre su righe di tabella sarebbe
 * verificabile solo su un database vivo, cioè mai in tempo utile.
 *
 * Nel database resta ciò che è davvero dato: chi possiede cosa (`Possesso`).
 */

/**
 * Cosa un oggetto è autorizzato a cambiare.
 *
 * Unione chiusa, ed è tutta la difesa. Non compaiono — e non devono comparire
 * mai — «ordinamento», «reputazione», «vetrina», «indicizzazione»,
 * «precedenza».
 */
export type Effetto = "aspetto-profilo" | "aspetto-feed" | "aspetto-avatar";

/** Dove vive un oggetto. Uno slot alla volta: due cornici non si sovrappongono. */
export type Slot = "cornice" | "tema" | "sfondo" | "titolo" | "emblema";

/**
 * Ogni slot dichiara cosa tocca.
 *
 * È ridondante rispetto al tipo `Effetto`, ed è voluto: il tipo impedisce di
 * scrivere un effetto vietato, questa tabella impedisce di aggiungere uno slot
 * senza aver risposto alla domanda «e questo cosa cambia?». La domanda è il
 * punto — un cosmetico che non si sa cosa tocchi è già fuori controllo.
 */
export const SLOT: Record<Slot, { label: string; tocca: readonly Effetto[] }> = {
  cornice: { label: "Cornice", tocca: ["aspetto-profilo"] },
  tema: { label: "Tema del profilo", tocca: ["aspetto-profilo"] },
  sfondo: { label: "Sfondo", tocca: ["aspetto-profilo"] },
  titolo: { label: "Titolo", tocca: ["aspetto-profilo", "aspetto-feed"] },
  emblema: { label: "Emblema", tocca: ["aspetto-avatar", "aspetto-feed"] },
};

/**
 * La rarità, che è un prezzo e una scarsità insieme.
 *
 * `stagionale` è quella che fa il lavoro vero. Un catalogo in cui tutto è
 * sempre disponibile non permette a nessuno di emergere: chiunque, con
 * abbastanza tempo, arriva ad avere tutto, e allora niente dice più niente. Un
 * oggetto che esce dal negozio a fine stagione e non torna resta la prova che
 * qualcuno c'era, e quella prova non si può recuperare dopo.
 *
 * È anche il motivo per cui i prezzi salgono poco: la cosa desiderabile non è
 * il costo, è la finestra.
 */
export type Rarita = "comune" | "raro" | "epico" | "stagionale";

export const RARITA: Record<Rarita, { label: string; tinta: string }> = {
  comune: { label: "Comune", tinta: "text-ink-muted" },
  raro: { label: "Raro", tinta: "text-brand-500" },
  epico: { label: "Epico", tinta: "text-accent-500" },
  stagionale: { label: "Stagionale", tinta: "text-gold-400" },
};

export type Cosmetico = {
  /** La chiave scritta in `Possesso.cosmeticoId`: non si cambia mai. */
  id: string;
  nome: string;
  slot: Slot;
  rarita: Rarita;
  /**
   * Prezzo in monete. `null` significa **non in vendita**: si ottiene solo
   * meritandolo, ed è la categoria che vale di più proprio perché il tempo non
   * la compra.
   */
  prezzo: number | null;
  /** Come si ottiene, se non si compra. Testo per chi guarda, non una regola. */
  sblocco?: string;
  /** La stagione in cui è stato in vendita: fuori da quella, non torna. */
  stagione?: string;
  /** Il valore che il componente userà per disegnarlo (colore, gradiente, glifo). */
  reso: string;
};

/**
 * Il catalogo.
 *
 * Volutamente corto. Un negozio con quaranta voci al primo giorno sembra un
 * gioco free-to-play e nessuna singola voce vale niente; con otto, ognuna si
 * riconosce. Cresce di stagione in stagione, che è anche l'unico motivo per
 * cui qualcuno tornerà a guardarlo.
 */
export const COSMETICI: readonly Cosmetico[] = [
  { id: "cornice-brace", nome: "Brace", slot: "cornice", rarita: "comune", prezzo: 120, reso: "#f59e0b" },
  { id: "cornice-onda", nome: "Onda", slot: "cornice", rarita: "comune", prezzo: 120, reso: "#06b6d4" },
  { id: "cornice-vetro", nome: "Vetro", slot: "cornice", rarita: "raro", prezzo: 400, reso: "#a78bfa" },
  { id: "tema-notturno", nome: "Notturno", slot: "tema", rarita: "raro", prezzo: 450, reso: "#1e1b4b" },
  { id: "tema-neon", nome: "Neon", slot: "tema", rarita: "epico", prezzo: 900, reso: "#ec4899" },
  { id: "sfondo-anfiteatro", nome: "Anfiteatro", slot: "sfondo", rarita: "epico", prezzo: 1100, reso: "anfiteatro" },
  {
    id: "titolo-prima-ora",
    nome: "Della prima ora",
    slot: "titolo",
    rarita: "stagionale",
    // Non in vendita, e questo è il punto: chi c'era ce l'ha, chi arriva dopo
    // no, e nessuna quantità di monete cambia la cosa.
    prezzo: null,
    sblocco: "Iscritto durante il primo anno di Vybes.",
    stagione: "2026",
    reso: "Della prima ora",
  },
  {
    id: "emblema-orecchio",
    nome: "Orecchio assoluto",
    slot: "emblema",
    rarita: "stagionale",
    prezzo: null,
    sblocco: "Primo posto nella classifica settimanale.",
    stagione: "2026",
    reso: "orecchio",
  },
];

const PER_ID = new Map(COSMETICI.map((c) => [c.id, c]));

export function cosmeticoDi(id: string): Cosmetico | undefined {
  return PER_ID.get(id);
}

/** Quelli che si possono comprare adesso. */
export function inVendita(): Cosmetico[] {
  return COSMETICI.filter((c) => c.prezzo !== null);
}

/**
 * Il prezzo, o l'errore.
 *
 * Restituisce un risultato invece di lanciare, perché «non è in vendita» non è
 * un guasto: è una risposta legittima a una richiesta legittima, e chi la
 * riceve deve poterla spiegare a chi ha premuto il pulsante.
 */
export function prezzoDi(id: string): { ok: true; prezzo: number } | { ok: false; motivo: string } {
  const c = PER_ID.get(id);
  if (!c) return { ok: false, motivo: "Questo oggetto non esiste." };
  if (c.prezzo === null) {
    return { ok: false, motivo: c.sblocco ? `Non è in vendita. ${c.sblocco}` : "Non è in vendita." };
  }
  return { ok: true, prezzo: c.prezzo };
}

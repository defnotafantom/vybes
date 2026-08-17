import { DISCIPLINES } from "@/lib/constants";

/**
 * L'atlante: ogni arte come contenuto, non come filtro.
 *
 * ── Il cambio di stato ──
 *
 * Finora una disciplina era una riga di `DISCIPLINES`: uno slug, un'etichetta,
 * un plurale. Serviva a filtrare un elenco di persone — cioè presupponeva che
 * tu sapessi già cosa stavi cercando.
 *
 * Qui diventa una cosa di cui si può parlare: cosa la gente crede che sia,
 * cos'è davvero, in quante forme esiste, e chi la fa adesso vicino a te.
 * È la **destinazione** dell'incontro (POSIZIONE.md): l'incontro ti mette
 * davanti un'opera che non avresti cercato, questa pagina è dove approfondisci
 * se quell'opera ti ha toccato.
 *
 * ── Perché un file e non una tabella ──
 *
 * Perché non è dato d'uso: è redazione. Cambia quando qualcuno la scrive, non
 * quando qualcuno usa il sito, e va rivista come si rivede un testo — con un
 * diff, davanti a qualcuno. Metterla in una tabella significherebbe modificarla
 * da un pannello, cioè senza che nessuno se ne accorga.
 *
 * Il giorno in cui a scriverle saranno in dieci, questo file diventa
 * l'interfaccia da riempire e non il posto dove scrivere. Non prima.
 *
 * ── Perché quasi tutte sono ancora vuote ──
 *
 * Perché una scritta bene vale dieci abbozzate, e perché il modello si giudica
 * su una. Le arti senza scheda hanno comunque la loro pagina, con la parte
 * viva — chi la pratica, cosa ha caricato, quali ingaggi sono aperti — e lo
 * dicono: **manca la scheda**, non «non c'è niente».
 *
 * Uno spazio dichiarato vuoto è un invito; uno riempito di parole generiche è
 * una bugia che poi nessuno riscrive.
 */

export type SchedaArte = {
  /** Il pregiudizio più diffuso, detto per intero e senza addolcirlo. */
  siCrede: string;
  /** La correzione. Due o tre frasi: non è un saggio, è una porta. */
  invece: string;
  /**
   * Le forme in cui l'arte esiste davvero.
   *
   * È la parte che fa più lavoro contro lo stereotipo: un pregiudizio vive
   * perché la parola richiama **una** immagine, e l'elenco la moltiplica.
   */
  forme: { nome: string; nota: string }[];
  /** Dove la si incontra dal vivo, per chi volesse andarci invece che leggerne. */
  doveVederla: string;
};

/**
 * Le schede, per slug di disciplina.
 *
 * La chiave è lo stesso slug di `DISCIPLINES`: un'arte senza riga qui esiste
 * lo stesso, e la pagina si adatta. Il controllo che le chiavi siano slug veri
 * sta in `tests/unit/arti.test.ts` — un refuso qui creerebbe una scheda che
 * non compare da nessuna parte, senza nessun errore.
 */
export const SCHEDE: Partial<Record<string, SchedaArte>> = {
  ballerini: {
    siCrede:
      "Che sia una cosa da bambine, che finisca con l'adolescenza, e che chi continua lo faccia per hobby perché «non è un lavoro».",
    invece:
      "È un mestiere del corpo, con un allenamento quotidiano paragonabile a quello di uno sport professionistico e una carriera che in Italia quasi nessuno riesce a documentare. Non perché sia rara: perché la maggior parte degli ingaggi è breve, pagata a mano e non lascia traccia da nessuna parte.",
    forme: [
      {
        nome: "Contemporanea",
        nota: "Linguaggio aperto, spesso costruito sullo spazio in cui va in scena invece che su un palco.",
      },
      {
        nome: "Urbana",
        nota: "Hip hop, house, breaking: nate nei cortili e nelle strade, con una tecnica codificata quanto quella accademica.",
      },
      {
        nome: "Popolare e tradizionale",
        nota: "Pizzica, tarantella, balli di coppia: si imparano per imitazione, non a scuola, e ogni valle ha la sua versione.",
      },
      {
        nome: "Accademica",
        nota: "Classico e neoclassico, il ramo che tutti hanno in mente quando sentono la parola.",
      },
      {
        nome: "Danza inclusiva",
        nota: "Con corpi che la danza accademica non ha mai considerato: in carrozzina, sordi, over sessanta.",
      },
    ],
    doveVederla:
      "Molto meno nei teatri di quanto si pensi: rassegne di quartiere, festival estivi, cortili, palestre, capannoni recuperati. È quasi sempre gratis o quasi, e quasi mai pubblicizzato dove lo cercheresti.",
  },
};

/** Le arti che hanno una scheda scritta. */
export function artiConScheda(): string[] {
  return DISCIPLINES.filter((d) => SCHEDE[d.slug]).map((d) => d.slug);
}

/** L'arte, se lo slug esiste. Restituisce anche la scheda, che può mancare. */
export function arteDa(slug: string) {
  const disciplina = DISCIPLINES.find((d) => d.slug === slug);
  if (!disciplina) return null;
  return { disciplina, scheda: SCHEDE[slug] ?? null };
}

import { fromCsv } from "@/lib/slug";

/**
 * Il ruolo, e cosa ha il diritto di cambiare.
 *
 * ── Il problema ──
 *
 * `User.role` esisteva da sempre e non faceva quasi niente. Chi si iscriveva
 * per **cercare** artisti riceveva il prodotto costruito per chi vuole
 * **essere trovato**: un menu con Portfolio e Quest, una colonna con il
 * livello, il turno in vetrina e una reputazione calcolata su portfolio e
 * discipline. Tre voci su otto di quel punteggio erano irraggiungibili per
 * lui — quarantacinque punti su centodieci — e la scheda gli suggeriva di
 * caricare lavori che non ha.
 *
 * Non è una svista estetica: il lato che *paga* riceveva il prodotto
 * dell'altro lato, con dentro un punteggio che lo dichiarava mediocre per
 * sempre e obiettivi che non poteva chiudere.
 *
 * ── La scelta: cosa si mostra, non cosa si può fare ──
 *
 * La tentazione era trattare il ruolo come un permesso: nascondere il
 * portfolio a un organizzatore, vietargli le quest degli artisti. Sarebbe
 * sbagliato, e si rompe al primo caso vero — un locale che ha anche una band
 * residente, un artista che organizza la propria jam. Nel prodotto oggi
 * chiunque può pubblicare un ingaggio, ed è giusto così.
 *
 * Quindi il ruolo è un'**intenzione dichiarata**, non un lucchetto: decide
 * cosa sta in primo piano e cosa il sistema ti promette. Le sezioni restano
 * tutte raggiungibili; cambia l'ordine, cambia cosa ti si propone da fare, e
 * cambia su cosa vieni misurato.
 *
 * La regola pratica che ne discende, e che vale per ogni aggiunta futura:
 * **non promettere a un ruolo un obiettivo che il suo ruolo non raggiunge.**
 * Un elenco pieno di cose impossibili non motiva nessuno — insegna a
 * ignorare l'elenco.
 *
 * ── Il terzo valore, e perché non un CSV ──
 *
 * Le due cose possono coesistere davvero: un locale con una band residente,
 * un collettivo che organizza la propria rassegna. Da qui `ENTRAMBI`.
 *
 * La via che sembrava naturale era rendere `role` una lista separata da
 * virgole, come già si fa per le discipline e per i ruoli delle quest. **È
 * stata scartata**, e il motivo è una riga sola: la directory pubblica filtra
 * `role: "ARTIST"` su un indice composto, ed è la query più calda del sito.
 * Con una lista quel filtro diventerebbe una ricerca per sottostringa, e
 * l'indice smetterebbe di servire — un rallentamento invisibile finché gli
 * iscritti sono pochi, e non più rimediabile quando non lo sono.
 *
 * Con un terzo valore il filtro resta `role: { in: [...] }`, che l'indice
 * copre. Il prezzo è che i ruoli non possono diventare quattro senza
 * ripensarci; con due lati di un mercato, non diventeranno quattro.
 */

export type Ruolo = "ARTIST" | "RECRUITER" | "ENTRAMBI";

/** I valori validi in colonna. Un solo posto che lo dice. */
export const RUOLI: readonly Ruolo[] = ["ARTIST", "RECRUITER", "ENTRAMBI"] as const;

/**
 * Il ruolo scritto nel database, normalizzato.
 *
 * Uno sconosciuto ricade sull'artista invece di sollevare: una stringa
 * inattesa in colonna — un valore vecchio, un'importazione sbagliata — non
 * deve svuotare la pagina di qualcuno né azzerarne la reputazione.
 */
export function ruoloDi(role: string | null | undefined): Ruolo {
  return RUOLI.includes(role as Ruolo) ? (role as Ruolo) : "ARTIST";
}

/** Si fa trovare: ha un portfolio, compare nella directory, si candida. */
export function faArtista(role: string | null | undefined): boolean {
  const r = ruoloDi(role);
  return r === "ARTIST" || r === "ENTRAMBI";
}

/** Cerca: pubblica annunci, riceve candidature, deve rispondere. */
export function cerca(role: string | null | undefined): boolean {
  const r = ruoloDi(role);
  return r === "RECRUITER" || r === "ENTRAMBI";
}

/**
 * Le formule che si applicano a questo ruolo.
 *
 * Reputazione, distintivi e obiettivi hanno due versioni, una per lato del
 * mercato. Chi fa entrambe le cose le riceve entrambe — e questa funzione è
 * l'unico posto che lo decide, così le tre cose non possono divergere.
 */
export function latiDi(role: string | null | undefined): ("ARTIST" | "RECRUITER")[] {
  const r = ruoloDi(role);
  if (r === "ENTRAMBI") return ["ARTIST", "RECRUITER"];
  return [r];
}

/**
 * Questa cosa si propone a questo ruolo?
 *
 * `ruoli` vuoto significa «a tutti»: è il default della colonna, e serve
 * perché una quest nuova sia visibile finché qualcuno non decide a chi
 * appartiene. Il silenzio è inclusivo, non esclusivo — l'opposto
 * nasconderebbe le righe nuove senza che nessuno se ne accorga.
 *
 * Chi ha entrambi i ruoli vede ciò che è destinato a uno **qualsiasi** dei
 * due: è la lettura giusta di «faccio tutte e due le cose», e l'unica che non
 * lascia fuori metà degli obiettivi a chi ne ha di più.
 */
export function perRuolo(ruoli: string, ruolo: Ruolo): boolean {
  const elenco = fromCsv(ruoli);
  if (elenco.length === 0) return true;
  return latiDi(ruolo).some((lato) => elenco.includes(lato));
}

/** Come si chiama, in italiano, quello che questa persona fa qui. */
export const NOME_RUOLO: Record<Ruolo, string> = {
  ARTIST: "artista",
  RECRUITER: "organizzatore",
  ENTRAMBI: "artista e organizzatore",
};

/**
 * Le tre scelte, come si presentano a chi deve sceglierle.
 *
 * Stanno qui e non nelle pagine perché compaiono in due punti — la scelta
 * dopo l'accesso con Google e le impostazioni del profilo — e due elenchi
 * scritti a mano divergono: chi legge il secondo sceglierebbe una cosa
 * descritta diversamente da come gliela avevano descritta la prima volta.
 */
export const SCELTE_RUOLO: readonly {
  valore: Ruolo;
  titolo: string;
  descrizione: string;
}[] = [
  {
    valore: "ARTIST",
    titolo: "Sono un artista",
    descrizione:
      "Voglio essere trovato: ho un portfolio, compaio negli elenchi, mi candido agli ingaggi aperti.",
  },
  {
    valore: "RECRUITER",
    titolo: "Cerco artisti",
    descrizione:
      "Pubblico annunci e ricevo candidature. Gestisco un locale, un festival, un progetto.",
  },
  {
    valore: "ENTRAMBI",
    titolo: "Tutte e due",
    descrizione:
      "Faccio entrambe le cose — un locale con una band residente, un collettivo che organizza la propria rassegna. Ricevi le sezioni e gli obiettivi di tutti e due i lati.",
  },
] as const;

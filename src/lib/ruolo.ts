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
 */

export type Ruolo = "ARTIST" | "RECRUITER";

/** Il ruolo scritto nel database, normalizzato. Sconosciuto vale artista. */
export function ruoloDi(role: string | null | undefined): Ruolo {
  return role === "RECRUITER" ? "RECRUITER" : "ARTIST";
}

/** Chi si è iscritto per cercare artisti, non per farsi trovare. */
export function cerca(role: string | null | undefined): boolean {
  return ruoloDi(role) === "RECRUITER";
}

/**
 * Questa cosa si propone a questo ruolo?
 *
 * `ruoli` vuoto significa «a tutti»: è il default della colonna, e serve
 * perché una quest nuova sia visibile finché qualcuno non decide a chi
 * appartiene. Il silenzio è inclusivo, non esclusivo — l'opposto
 * nasconderebbe le righe nuove senza che nessuno se ne accorga.
 */
export function perRuolo(ruoli: string, ruolo: Ruolo): boolean {
  const elenco = fromCsv(ruoli);
  return elenco.length === 0 || elenco.includes(ruolo);
}

/**
 * Come si chiama, in italiano, quello che sta facendo qui.
 *
 * Sta qui e non sparso nei componenti perché le stesse due parole comparivano
 * riscritte a mano in ogni pagina, e divergevano: «organizzatore» in un
 * punto, «recruiter» in un altro, «chi ingaggia» in un terzo. Sono la stessa
 * persona, e chiamarla in tre modi la costringe a capirlo da sola.
 */
export const NOME_RUOLO: Record<Ruolo, string> = {
  ARTIST: "artista",
  RECRUITER: "organizzatore",
};

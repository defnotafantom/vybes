/**
 * Chi compare in vetrina, in home, e con quale criterio.
 *
 * ── Il premio ──
 *
 * È il secondo dei premi in visibilità (ADR-042), e quello che sostituisce la
 * ricompensa quotidiana di un gioco. La differenza è cosa si vince: non una
 * moneta da spendere in un negozio, ma il posto più visto del sito. Per un
 * artista è la cosa che vuole davvero, e per la directory è un miglioramento —
 * chi arriva in home trova qualcuno di diverso ogni giorno invece della stessa
 * fila di sempre.
 *
 * ── Perché una rotazione e non una classifica ──
 *
 * La home mostrava i profili con la reputazione più alta. Sembra meritocratico
 * e come incentivo è morto: i primi sei sono sempre gli stessi, chi è settimo
 * non ci arriverà mai, e chi è primo non ha motivo di fare altro. Una
 * classifica premia una volta e poi smette di chiedere qualcosa.
 *
 * Qui invece si supera una **soglia** — profilo con disciplina, contenuto
 * vero, indirizzo confermato — e da quel momento si è nella rotazione. Il
 * premio non è per il migliore: è per chi ha fatto il lavoro, e tocca a tutti
 * quelli che l'hanno fatto. È una fila, non un podio.
 *
 * L'incentivo che ne esce è raggiungibile, che è l'unica proprietà che conta
 * in un incentivo: «completa il profilo e prima o poi sei in home» è una cosa
 * che una persona può decidere di fare. «Diventa il primo di trecento» no.
 *
 * ── Perché è scarsa ──
 *
 * Perché la scarsità è ciò che la rende desiderabile, e cresce da sé: più
 * artisti superano la soglia, più raro è il proprio turno. È il contrario di
 * una ricompensa che si svaluta man mano che la si distribuisce.
 *
 * ── Perché senza processi programmati e senza scritture ──
 *
 * La scelta è una funzione pura del giorno: nessun lavoro notturno da tenere
 * in piedi, nessuna colonna da aggiornare, nessuno stato che può divergere
 * dalla realtà. La pagina si rigenera una volta al giorno e basta a sé stessa.
 * Un premio quotidiano implementato con un processo programmato è un premio
 * che il giorno in cui quel processo non parte non c'è, e nessuno se ne
 * accorge finché non lo chiede qualcuno.
 */

/**
 * Quanti profili stanno in vetrina, e sta scritto qui.
 *
 * Era un `6` scritto nella home e un altro `6` nella dashboard. Due numeri
 * uguali per caso, e già sbagliati entrambi: la home rende **tre** schede —
 * una grande e due piccole, il resto della griglia sono i conteggi e l'invito
 * a vedere tutti — quindi con sei posti metà della vetrina veniva caricata e
 * buttata via, e la dashboard prometteva un turno che a quelle persone non
 * sarebbe mai arrivato.
 *
 * È il difetto peggiore possibile per un premio: il sistema dice di sì e non
 * fa niente. Con la costante in un posto solo, cambiare il numero di schede
 * in home cambia anche la promessa — che è l'unico modo perché le due non
 * possano più divergere.
 */
export const POSTI_VETRINA = 3;

/**
 * Il numero del giorno, per far ruotare la vetrina.
 *
 * Conta i giorni dall'epoca in ora italiana: il cambio avviene a mezzanotte
 * qui, non a Londra. Su Vercel il server gira a UTC, quindi senza questo
 * spostamento la vetrina cambierebbe all'una o alle due di notte — cioè
 * mentre qualcuno la sta ancora guardando.
 *
 * L'ora legale sposta il cambio di un'ora due volte l'anno. È accettabile: il
 * costo dell'alternativa è una libreria di fusi orari per spostare di
 * sessanta minuti un evento che nessuno cronometra.
 */
export function giornoDi(adesso: Date = new Date()): number {
  const ORE_ITALIA = 1; // CET; d'estate il cambio slitta di un'ora, e va bene
  return Math.floor((adesso.getTime() + ORE_ITALIA * 3_600_000) / 86_400_000);
}

/**
 * Chi è in vetrina oggi.
 *
 * Una finestra scorrevole sull'elenco dei candidati: ogni giorno avanza di
 * uno, quindi uno esce e uno entra. Chi guarda la home due giorni di fila
 * vede qualcosa di cambiato ma non tutto — che è il ritmo giusto per una
 * pagina che si vuole far tornare a visitare.
 *
 * L'elenco dei candidati deve arrivare **in ordine stabile** — per slug, per
 * data d'iscrizione — e mai per reputazione: un ordine che cambia da solo
 * farebbe saltare il turno a qualcuno senza che nessuno lo abbia deciso.
 */
export function inVetrina<T>(candidati: T[], posti: number, giorno: number): T[] {
  if (candidati.length === 0 || posti <= 0) return [];
  if (candidati.length <= posti) return [...candidati];

  const n = candidati.length;
  const inizio = ((giorno % n) + n) % n; // il modulo di un numero negativo, in JS, è negativo
  return Array.from({ length: posti }, (_, i) => candidati[(inizio + i) % n]);
}

/**
 * Fra quanti giorni tocca a chi sta in posizione `indice`.
 *
 * Serve a dirlo all'artista nella propria area personale: un premio che non
 * si sa di poter vincere non incentiva niente, e «sei in rotazione» senza un
 * quando è una frase che non si può verificare.
 *
 * Zero significa: sei in vetrina adesso.
 */
export function fraQuantiGiorni(indice: number, totale: number, posti: number, giorno: number): number {
  if (totale <= posti) return 0;
  const inizio = ((giorno % totale) + totale) % totale;
  const distanza = ((indice - inizio) % totale + totale) % totale;
  return distanza < posti ? 0 : distanza;
}

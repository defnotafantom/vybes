import { z } from "zod";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { giornoDi } from "@/lib/vetrina";
import { DOMANDE_PER_TURNO } from "@/lib/orecchio";
import { turnoDi, senzaRisposte, registraPartita, partitaDiOggi } from "@/lib/orecchio-server";

/**
 * «L'orecchio»: il turno del giorno, e la sua correzione.
 *
 * ── La regola ──
 *
 * Le soluzioni non escono da questa rotta se non insieme al risultato finale.
 * La GET manda le domande senza risposta; la POST riceve le scelte e ricalcola
 * il punteggio ricostruendo lo stesso turno dallo stesso seme.
 *
 * Non è prudenza generica: mandare le soluzioni al browser significherebbe che
 * la classifica la vince chi apre gli strumenti di sviluppo, e una classifica
 * vincibile così smette di significare qualcosa anche per chi non sa che si
 * possa fare.
 *
 * ── Perché non c'è un identificativo di partita ──
 *
 * Perché il turno è deterministico: si ricostruisce dal solo numero del
 * giorno. Niente sessione di gioco da conservare, niente stato che possa
 * scadere o essere manomesso, e un turno passato si può ricalcolare mesi dopo
 * per verificare una contestazione sulla classifica.
 */

/** Il turno di oggi, senza soluzioni. */
export async function GET(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "orecchio-leggi", limit: 60 });
    if (g.error) return g.error;

    const giorno = giornoDi();
    const [domande, gia] = await Promise.all([turnoDi(giorno), partitaDiOggi(g.user!.id, giorno)]);

    if (domande.length === 0) {
      // Non è un errore: è il gioco che non ha ancora abbastanza materiale.
      // Un 404 farebbe scrivere «qualcosa è andato storto» a chi legge, e
      // niente è andato storto — semplicemente non ci sono ancora abbastanza
      // artisti con dei lavori caricati.
      return ok({ disponibile: false, giorno, motivo: "servono-artisti" });
    }

    return ok({
      disponibile: true,
      ...senzaRisposte(giorno, domande),
      // Se ha già giocato, la partita è finita: si mostra il risultato invece
      // delle domande. Il client lo saprebbe comunque al primo invio, ma
      // scoprirlo dopo aver riascoltato cinque brani è una presa in giro.
      gia: gia ?? null,
    });
  });
}

/**
 * Le scelte, per posizione.
 *
 * `nullable` perché saltare una domanda è legittimo e vale come sbagliata:
 * costringere a rispondere spingerebbe a tirare a indovinare, e una risposta
 * a caso non insegna nessun nome.
 *
 * Il tetto su `max` non è cortesia verso il server: senza, un elenco di
 * diecimila voci arriverebbe in memoria prima di qualunque controllo.
 */
const scelteSchema = z.object({
  giorno: z.number().int(),
  scelte: z.array(z.string().max(120).nullable()).max(DOMANDE_PER_TURNO),
});

/** Consegna le risposte, riceve il punteggio. */
export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "orecchio-gioca", limit: 20 });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, scelteSchema);
    if (error) return error;

    // Il giorno arriva dal client ed è quindi un'affermazione, non un fatto:
    // accettandolo si potrebbe rigiocare all'infinito cambiando numero, e
    // riscuotere monete per ogni turno passato di cui si conoscono già le
    // soluzioni. Serve solo a scoprire chi ha la pagina aperta da ieri sera.
    const giorno = giornoDi();
    if (data.giorno !== giorno) {
      return fail(
        "Il turno è cambiato mentre giocavi: ricarica per avere quello di oggi.",
        409
      );
    }

    const esito = await registraPartita(g.user!.id, giorno, data.scelte);
    if (!esito.ok) return fail(esito.motivo, 409);

    return ok(esito.esito);
  });
}

import { guard, ok, fail, handle } from "@/lib/api";
import { gira } from "@/lib/ruota-server";

/**
 * Un giro di ruota.
 *
 * Nessun corpo da validare: non c'è niente che il client possa dire. Il
 * giorno lo decide il server, il premio lo decide il seme, e l'unicità la
 * decide il vincolo sul database. È il tipo di rotta che si vorrebbe sempre —
 * la superficie d'attacco è la sessione e basta.
 *
 * Il limite è basso di proposito: un giro al giorno riesce anche con cinque
 * tentativi, e chi ne fa di più sta provando qualcosa.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "ruota", limit: 10 });
    if (g.error) return g.error;

    const esito = await gira(g.user!.id);

    // 409 e non 400: la richiesta era ben formata, è lo **stato** che non la
    // permette — già girata oggi, oppure non ancora sbloccata.
    if (!esito.ok) return fail(esito.motivo, 409);

    return ok({
      premio: esito.premio.chiave,
      etichetta: esito.premio.etichetta,
      monete: esito.monete,
      saldo: esito.saldo,
      nuovoOggetto: esito.nuovoOggetto,
    });
  });
}

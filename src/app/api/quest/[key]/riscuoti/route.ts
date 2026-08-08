import { guard, ok, fail, handle } from "@/lib/api";
import { riscuotiQuest } from "@/lib/gamification";
import { levelProgress } from "@/lib/levels";
import { prisma } from "@/lib/prisma";

/**
 * Incassa la ricompensa di una quest completata.
 *
 * ── Cosa risponde, e perché ──
 *
 * Non un `ok` e basta: restituisce l'XP riscosso e **il livello aggiornato**.
 * L'animazione lato client deve far salire la barra fino al punto giusto, e
 * ricalcolarlo nel browser significherebbe riscrivere `levelProgress` una
 * seconda volta — cioè la regola in due posti, che su questo progetto ha già
 * prodotto la sua dose di difetti. La barra si muove verso un numero che
 * arriva dal server, l'unico che sa quanto vale davvero.
 *
 * ── Il limite di richieste ──
 *
 * Basso di proposito. Non è un'operazione che si ripete: le quest sono otto,
 * e chi ne riscuote quaranta al minuto sta provando a incassare due volte la
 * stessa. La difesa vera è comunque nella scrittura condizionata dentro
 * `riscuotiQuest`; questa è la seconda.
 */
export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "quest-riscuoti", limit: 20 });
    if (g.error) return g.error;

    const { key } = await params;
    const esito = await riscuotiQuest(g.user!.id, key);

    if (!esito.ok) {
      // Messaggi distinti: «non l'hai ancora completata» e «l'hai già
      // riscossa» richiedono due cose diverse a chi legge, e dirle uguali
      // costringe a indovinare.
      const messaggi = {
        sconosciuta: "Questa quest non esiste",
        "non-completata": "Questa quest non è ancora completata",
        "gia-riscossa": "Hai già riscosso questa ricompensa",
      } as const;
      return fail(messaggi[esito.motivo], esito.motivo === "sconosciuta" ? 404 : 409);
    }

    const me = await prisma.user.findUnique({
      where: { id: g.user!.id },
      select: { experience: true },
    });

    return ok({
      xp: esito.xp,
      monete: esito.monete,
      titolo: esito.titolo,
      livello: levelProgress(me?.experience ?? 0),
    });
  });
}

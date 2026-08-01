import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, parseBody, ok, handle } from "@/lib/api";
import { MOTIVI_VALIDI, TIPI_SEGNALABILI, percorsoOggetto } from "@/lib/segnalazioni";
import type { TipoSegnalabile } from "@/lib/segnalazioni";

/**
 * Ricezione delle segnalazioni — Digital Services Act, "notice and action".
 *
 * `requireAuth: false`: la norma non riserva la segnalazione agli iscritti, e
 * chi arriva da una ricerca e incappa in un contenuto illecito non ha alcun
 * motivo di registrarsi per poterlo dire. Obbligare all'account significa
 * ricevere meno segnalazioni proprio dalle persone meno coinvolte, che sono le
 * più attendibili.
 *
 * Il prezzo è che la rotta è aperta, quindi il limite di richieste è la sola
 * difesa contro chi la usa per sommergere la coda. Sei all'ora per indirizzo:
 * abbastanza per segnalare un profilo e i suoi contenuti in una sessione, poco
 * per fare rumore.
 */

const schema = z.object({
  targetType: z.enum(TIPI_SEGNALABILI),
  targetId: z.string().min(1).max(200),
  reason: z.enum(MOTIVI_VALIDI as [string, ...string[]]),
  details: z.string().trim().max(2000).optional(),
  // Facoltativa: serve solo a ricevere l'esito. Chi preferisce non lasciarla
  // segnala comunque — il riscontro è un diritto di chi lo vuole, non un
  // obbligo di identificarsi.
  reporterEmail: z.string().email("Indirizzo non valido").optional().or(z.literal("")),
});

export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "segnalazioni", limit: 6, requireAuth: false });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, schema);
    if (error) return error;

    // "Altro" senza spiegazione è una segnalazione che nessuno può valutare:
    // arriverebbe in coda solo per essere respinta dopo aver fatto perdere
    // tempo. Meglio chiederla adesso, quando chi segnala ha il contesto in
    // testa.
    if (data.reason === "ALTRO" && !data.details?.trim()) {
      return Response.json(
        {
          ok: false,
          error: "Descrivi il problema",
          details: { details: "Con «Altro» serve una descrizione" },
        },
        { status: 422 }
      );
    }

    // La sessione può esserci anche se non è obbligatoria: se c'è, la
    // segnalazione porta un nome, e una segnalazione con un nome pesa di più.
    const { auth } = await import("@/lib/auth");
    const session = await auth();

    await prisma.report.create({
      data: {
        targetType: data.targetType,
        targetId: data.targetId,
        targetUrl: percorsoOggetto(data.targetType as TipoSegnalabile, data.targetId),
        reason: data.reason,
        details: data.details?.trim() || null,
        reporterId: session?.user?.id ?? null,
        reporterEmail: data.reporterEmail?.trim() || null,
      },
    });

    // Nessun dettaglio sull'esito: dire "già segnalato" o "questo contenuto ha
    // dodici segnalazioni" trasformerebbe la rotta in uno strumento per
    // sondare cosa è sotto esame.
    return ok({
      ricevuta: true,
      messaggio:
        "Segnalazione ricevuta. La esaminiamo il prima possibile; se hai lasciato un indirizzo, ti scriveremo l'esito.",
    });
  });
}

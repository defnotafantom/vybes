import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import { puo } from "@/lib/moderazione";
import { STATI } from "@/lib/segnalazioni";
import { sendReportDecisionEmail } from "@/lib/email";

/**
 * Decisione su una segnalazione.
 *
 * Il Digital Services Act chiede che il trattamento sia «tempestivo, diligente,
 * non arbitrario e obiettivo» e che la decisione sia comunicata a chi ha
 * segnalato. Da qui due vincoli che il codice impone invece di limitarsi a
 * suggerirli: la motivazione è obbligatoria quando la segnalazione si chiude, e
 * il riscontro parte da solo se chi ha segnalato ha lasciato un recapito.
 *
 * Obbligare alla motivazione non è burocrazia. Una decisione senza motivo
 * scritto non è verificabile da nessuno — né da chi ha segnalato, né da chi ha
 * subito la rimozione, né da chi si trovasse a moderare dopo — e «non
 * arbitrario» significa esattamente questo.
 */

const schema = z.object({
  status: z.enum(STATI),
  decisione: z.string().trim().max(2000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "moderazione", limit: 60 });
    if (g.error) return g.error;

    if (!(await puo(g.user!.id, PERMISSIONS.CONTENT_MODERATE))) {
      // 403 e non 404: chi arriva qui è autenticato, e nascondere l'esistenza
      // della rotta non protegge nulla che non sia già protetto.
      return fail("Non autorizzato", 403);
    }

    const { id } = await ctx.params;
    const { data, error } = await parseBody(req, schema);
    if (error) return error;

    const chiusa = data.status === "ACCOLTA" || data.status === "RESPINTA";
    const motivazione = data.decisione?.trim();

    if (chiusa && !motivazione) {
      return fail("Serve una motivazione", 422, {
        decisione: "Scrivi perché la segnalazione è stata accolta o respinta",
      });
    }

    const prima = await prisma.report.findUnique({
      where: { id },
      select: { reporterEmail: true, status: true },
    });
    if (!prima) return fail("Segnalazione non trovata", 404);

    const report = await prisma.report.update({
      where: { id },
      data: {
        status: data.status,
        decisione: motivazione || null,
        // Chi ha deciso e quando restano solo per le decisioni definitive:
        // «in esame» è un passaggio, non una decisione.
        decisaDaId: chiusa ? g.user!.id : null,
        decisaIl: chiusa ? new Date() : null,
      },
      select: { id: true, status: true },
    });

    // Il riscontro parte alla chiusura e solo se lo stato è davvero cambiato:
    // correggere una decisione già presa non deve produrre una seconda email
    // identica alla prima.
    if (chiusa && prima.status !== data.status && prima.reporterEmail) {
      await sendReportDecisionEmail(
        prima.reporterEmail,
        data.status === "ACCOLTA" ? "accolta" : "respinta",
        motivazione!
        // Registrato ma non rilanciato: se la posta è giù, la decisione resta
        // comunque salvata. Perdere il riscontro è meglio che perdere la
        // decisione.
      ).catch((e) => console.error("[segnalazioni] riscontro non inviato", e));
    }

    return ok(report);
  });
}

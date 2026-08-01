import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import { puo } from "@/lib/moderazione";
import { STATI, MOTIVI, type Motivo, type TipoSegnalabile } from "@/lib/segnalazioni";
import { oscura } from "@/lib/oscuramento";
import { sendReportDecisionEmail, sendModerationNoticeEmail } from "@/lib/email";

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
  /**
   * Se accogliendo si debba anche rendere invisibile il contenuto.
   *
   * Separato dall'esito perché non tutte le segnalazioni accolte portano a una
   * rimozione: una che denuncia un dato errato si accoglie e si corregge, non
   * si oscura. Legare le due cose toglierebbe a chi modera la misura
   * intermedia, e resterebbe solo la scelta fra ignorare e nascondere.
   */
  oscura: z.boolean().optional(),
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
      select: { reporterEmail: true, status: true, targetType: true, targetId: true, reason: true },
    });
    if (!prima) return fail("Segnalazione non trovata", 404);

    // L'oscuramento va tentato prima di registrare la decisione: se fallisce —
    // contenuto già cancellato dal suo autore, identificativo sbagliato — è
    // meglio che la segnalazione resti aperta piuttosto che risultare accolta
    // con un contenuto ancora online.
    let oscurato: Awaited<ReturnType<typeof oscura>> = null;
    if (data.oscura && data.status === "ACCOLTA") {
      try {
        oscurato = await oscura(prima.targetType as TipoSegnalabile, prima.targetId);
      } catch (e) {
        console.error("[segnalazioni] oscuramento fallito", e);
        return fail(
          "Il contenuto non è stato trovato: potrebbe essere già stato rimosso dal suo autore. " +
            "Puoi chiudere la segnalazione senza oscurare.",
          409
        );
      }
    }

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
    //
    // Registrato ma non rilanciato: se la posta è giù, la decisione resta
    // comunque salvata. Perdere il riscontro è meglio che perdere la decisione.
    if (chiusa && prima.status !== data.status && prima.reporterEmail) {
      await sendReportDecisionEmail(
        prima.reporterEmail,
        data.status === "ACCOLTA" ? "accolta" : "respinta",
        motivazione!
      ).catch((e) => console.error("[segnalazioni] riscontro non inviato", e));
    }

    // Motivazione a chi ha subito la rimozione — art. 17 DSA.
    //
    // È l'obbligo più facile da dimenticare, perché l'attenzione va a chi
    // segnala. Ma la norma impone la spiegazione soprattutto a chi subisce la
    // restrizione: rimuovere in silenzio è esattamente il comportamento che
    // vieta. Parte solo se una restrizione c'è stata davvero — accogliere
    // senza oscurare non impone nulla, e non è dovuta.
    if (oscurato?.autore) {
      await sendModerationNoticeEmail(
        oscurato.autore.email,
        oscurato.autore.name,
        oscurato.descrizione,
        MOTIVI[prima.reason as Motivo]?.label ?? prima.reason,
        motivazione!
      ).catch((e) => console.error("[segnalazioni] avviso all'autore non inviato", e));
    }

    return ok({ ...report, oscurato: Boolean(oscurato) });
  });
}

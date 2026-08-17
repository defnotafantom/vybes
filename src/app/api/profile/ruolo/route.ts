import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guard, parseBody, ok, handle } from "@/lib/api";
import { RUOLI } from "@/lib/ruolo";
import { ricalcolaReputazione } from "@/lib/reputazione-server";
import { syncProfileQuest, syncPortfolioQuests } from "@/lib/gamification";
import { slugDi } from "@/lib/utente";

/**
 * Cambiare ruolo.
 *
 * ── Perché non basta scrivere la colonna ──
 *
 * Il ruolo non è un'etichetta: è **quale formula ti misura**. Cambiandolo
 * cambiano le voci della reputazione, quali obiettivi ti si propongono e quali
 * distintivi la tua pagina pubblica può mostrare.
 *
 * Scrivere solo `role` lascerebbe in colonna un `reputation` calcolato con la
 * formula di prima: un numero perfettamente plausibile, che ordina la directory
 * e non corrisponde più a niente. Nessun errore, nessun sintomo — è la forma di
 * difetto numero tre di COLLOQUIO.md, una difesa che vale in una direzione
 * sola, e questa rotta è esattamente il punto in cui si presenterebbe.
 *
 * Quindi: si scrive, si ricalcola, si risincronizzano gli obiettivi.
 *
 * ── E la pagina pubblica ──
 *
 * `/artisti/[slug]` è rigenerata a intervalli. Passando a organizzatore
 * cambiano i tre numeri in cima e i distintivi: senza `revalidatePath` la
 * versione vecchia resterebbe servita per un'ora, e chi ha appena cambiato
 * andrebbe a controllare e non vedrebbe niente.
 */

const schema = z.object({
  // `RUOLI` e non tre stringhe scritte a mano: l'elenco valido vive in un
  // posto solo, e aggiungerne uno domani non deve richiedere di ricordarsi
  // di questa riga.
  ruolo: z.enum(RUOLI as unknown as [string, ...string[]]),
});

export async function PATCH(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "profilo-ruolo", limit: 20 });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, schema);
    if (error) return error;

    await prisma.user.update({
      where: { id: g.user!.id },
      data: { role: data.ruolo, ruoloSceltoIl: new Date() },
    });

    // L'ordine conta: prima la colonna, poi tutto ciò che la legge.
    await ricalcolaReputazione(g.user!.id);
    await syncProfileQuest(g.user!.id);
    await syncPortfolioQuests(g.user!.id);

    const slug = await slugDi(g.user!.id);
    if (slug) revalidatePath(`/artisti/${slug}`);
    revalidatePath("/artisti");

    return ok({ ruolo: data.ruolo });
  });
}

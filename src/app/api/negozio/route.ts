import { z } from "zod";
import { revalidatePath } from "next/cache";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { acquista, indossa } from "@/lib/negozio";
import { slugDi } from "@/lib/utente";

/**
 * Il negozio: comprare e indossare.
 *
 * Una rotta sola con un campo `azione` invece di due rotte. Le due operazioni
 * condividono la validazione, la guardia e la rigenerazione della pagina
 * pubblica, e differiscono per tre righe: separarle avrebbe significato due
 * file quasi identici, cioè il posto in cui una correzione si applica a uno
 * solo dei due.
 *
 * ── Cosa **non** sta qui ──
 *
 * Il prezzo. Arriva dal catalogo lato server, sempre: se il client potesse
 * dire quanto paga, il negozio sarebbe gratis. È la stessa difesa della
 * riscossione delle quest — il client dice *quale*, mai *quanto*.
 */

const azioneSchema = z.object({
  azione: z.enum(["acquista", "indossa"]),
  // La lunghezza massima è quella di un id di catalogo abbondante: senza,
  // una stringa da un megabyte arriverebbe fino alla query.
  cosmetico: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "negozio", limit: 30 });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, azioneSchema);
    if (error) return error;

    const esito =
      data.azione === "acquista"
        ? await acquista(g.user!.id, data.cosmetico)
        : await indossa(g.user!.id, data.cosmetico);

    // 409 e non 400: la richiesta era ben formata, è lo **stato** che non la
    // permette — saldo insufficiente, oggetto già posseduto. Un 400 farebbe
    // cercare un errore di battitura dove non c'è.
    if (!esito.ok) return fail(esito.motivo, 409);

    // Il profilo pubblico è generato staticamente: senza questa riga la
    // cornice appena indossata comparirebbe in dashboard e non sulla pagina
    // che la gente guarda, che è l'unico posto in cui serviva.
    const slug = await slugDi(g.user!.id);
    if (slug) revalidatePath(`/artisti/${slug}`);

    return ok("saldo" in esito ? { saldo: esito.saldo } : {});
  });
}

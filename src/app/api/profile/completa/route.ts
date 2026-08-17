import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { completaProfiloSchema } from "@/lib/validations";
import { ricalcolaReputazione } from "@/lib/reputazione-server";
import { syncProfileQuest, syncPortfolioQuests } from "@/lib/gamification";

/**
 * Completare il profilo: nome, nickname, ruolo. Una volta sola.
 *
 * ── Perché una rotta a parte e non `PATCH /api/profile` ──
 *
 * Perché non è una modifica: è il passaggio da «account creato» a «utente».
 * Le tre cose vanno scritte **insieme o per niente** — un profilo con il ruolo
 * ma senza nickname è lo stato incoerente che questa rotta esiste per
 * impedire, e con tre chiamate separate quello stato sarebbe raggiungibile
 * chiudendo la scheda a metà.
 *
 * ── Perché non basta scrivere le colonne ──
 *
 * Il ruolo non è un'etichetta: è **quale formula ti misura**. Cambiandolo
 * cambiano le voci della reputazione, gli obiettivi proposti e i distintivi
 * che la pagina pubblica può mostrare. Scrivere solo `role` lascerebbe in
 * colonna un `reputation` calcolato con l'altra formula: un numero plausibile
 * che ordina la directory e non corrisponde a niente. Nessun errore, nessun
 * sintomo. Quindi: si scrive, si ricalcola, si risincronizzano gli obiettivi.
 *
 * ── La corsa sul nickname ──
 *
 * Due persone possono chiedere lo stesso nickname nello stesso istante. Un
 * controllo «esiste già?» seguito da una scrittura non lo impedisce: fra le
 * due c'è una finestra, e in quella finestra passano entrambe.
 *
 * L'unico arbitro valido è il vincolo `@unique` sulla colonna. Si tenta la
 * scrittura e si intercetta `P2002` — il codice con cui Prisma segnala la
 * violazione — traducendolo in un messaggio comprensibile. Il controllo
 * preventivo non c'è proprio: sarebbe una difesa che sembra funzionare e che
 * cede esattamente nel caso per cui è stata scritta.
 */
export async function PATCH(req: Request) {
  return handle(async () => {
    // L'unica rotta che un account incompleto deve poter chiamare: è quella
    // che lo completa. Ogni altra riceve 403 finché il profilo non c'è.
    const g = await guard(req, {
      scope: "profilo-completa",
      limit: 20,
      ancheIncompleto: true,
    });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, completaProfiloSchema);
    if (error) return error;

    try {
      await prisma.user.update({
        where: { id: g.user!.id },
        data: {
          name: data.name,
          slug: data.slug,
          role: data.ruolo,
          // Il segnale che distingue «è ARTIST perché l'ha detto» da «è
          // ARTIST perché è il default». Senza questa colonna la domanda o non
          // comparirebbe mai a nessuno, o ricomparirebbe a ogni accesso a
          // tutti.
          ruoloSceltoIl: new Date(),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return fail("Questo nickname è già preso", 409);
      }
      throw e;
    }

    // L'ordine conta: prima le colonne, poi tutto ciò che le legge.
    await ricalcolaReputazione(g.user!.id);
    await syncProfileQuest(g.user!.id);
    await syncPortfolioQuests(g.user!.id);

    // La pagina pubblica nasce adesso, con questo indirizzo: senza
    // rigenerare, il primo che la visita troverebbe la versione in cache di un
    // percorso che fino a un istante fa non esisteva.
    revalidatePath(`/artisti/${data.slug}`);
    revalidatePath("/artisti");

    return ok({ slug: data.slug, ruolo: data.ruolo });
  });
}

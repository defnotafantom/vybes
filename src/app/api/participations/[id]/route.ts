import { prisma } from "@/lib/prisma";
import { participationDecisionSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { grantXp, progressQuest } from "@/lib/gamification";
import { revalidatePath } from "next/cache";
import { ricalcolaReputazione } from "@/lib/reputazione-server";

/** L'organizzatore accetta o rifiuta una candidatura. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "participation-decide", limit: 60 });
    if (g.error) return g.error;
    const { id } = await params;

    const { data, error } = await parseBody(req, participationDecisionSchema);
    if (error) return error;

    const participation = await prisma.participation.findUnique({
      where: { id },
      include: { event: { select: { id: true, slug: true, title: true, organizerId: true } } },
    });
    if (!participation) return fail("Candidatura non trovata", 404);
    if (participation.event.organizerId !== g.user!.id) {
      return fail("Solo l'organizzatore può decidere", 403);
    }

    const updated = await prisma.participation.update({
      where: { id },
      data: { status: data.status, respondedAt: new Date() },
    });

    if (data.status === "ACCEPTED") {
      await grantXp(participation.userId, 40);
      // Un ingaggio confermato è la voce che pesa di più nella reputazione
      // dell'artista, ed è l'unica che non dipende da lui: gliela assegna
      // qualcun altro scegliendolo. Il ricalcolo va fatto qui, dove il fatto
      // accade.
      await ricalcolaReputazione(participation.userId);
    }

    /* ── Anche quella di chi ha risposto ──
     *
     * «Rispondi a chi si candida» vale un quarto della reputazione di un
     * organizzatore, e questo è l'unico punto del sistema in cui quel fatto
     * cambia. Senza questa riga la regola esisteva nella formula e niente la
     * applicava: il punteggio si sarebbe aggiornato solo al successivo
     * salvataggio del profilo — cioè, per la maggior parte delle persone,
     * mai — e chi risponde a tutti sarebbe rimasto fermo a chiedersi perché.
     *
     * È la forma di difetto che questo progetto ha già incontrato più volte, e
     * l'ho quasi rifatta trenta minuti dopo aver scritto la formula.
     */
    await ricalcolaReputazione(participation.event.organizerId);
    await progressQuest(participation.event.organizerId, "prima_risposta");

    await notify({
      recipientId: participation.userId,
      actorId: g.user!.id,
      type: data.status === "ACCEPTED" ? "EVENT_ACCEPTED" : "EVENT_REJECTED",
      body:
        data.status === "ACCEPTED"
          ? `Sei stato confermato per "${participation.event.title}"`
          : `La candidatura per "${participation.event.title}" non è stata accolta`,
      entityId: participation.event.id,
      entityUrl: `/eventi/${participation.event.slug}`,
    });

    revalidatePath(`/eventi/${participation.event.slug}`);
    return ok(updated);
  });
}

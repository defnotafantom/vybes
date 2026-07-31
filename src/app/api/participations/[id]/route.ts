import { prisma } from "@/lib/prisma";
import { participationDecisionSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { grantXp } from "@/lib/gamification";
import { revalidatePath } from "next/cache";

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

    if (data.status === "ACCEPTED") await grantXp(participation.userId, 40, 5);

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

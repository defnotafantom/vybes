import { prisma } from "@/lib/prisma";
import { participationSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { progressQuest, grantXp } from "@/lib/gamification";
import { ricalcolaReputazione } from "@/lib/reputazione-server";
import { revalidatePath } from "next/cache";

/** Candidatura di un artista a un ingaggio. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "participate", limit: 20 });
    if (g.error) return g.error;
    const { id } = await params;

    const { data, error } = await parseBody(req, participationSchema);
    if (error) return error;

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true, slug: true, title: true, organizerId: true, status: true,
        startsAt: true, capacity: true, _count: { select: { participations: true } },
      },
    });
    if (!event) return fail("Ingaggio non trovato", 404);
    if (event.organizerId === g.user!.id) return fail("Non puoi candidarti a un tuo ingaggio", 400);
    if (event.status !== "PUBLISHED") return fail("Le candidature per questo ingaggio sono chiuse", 409);
    if (event.startsAt < new Date()) return fail("L'ingaggio è già passato", 409);
    if (event.capacity && event._count.participations >= event.capacity) {
      return fail("Posti esauriti", 409);
    }

    const existing = await prisma.participation.findUnique({
      where: { eventId_userId: { eventId: id, userId: g.user!.id } },
    });
    if (existing && existing.status !== "CANCELLED") {
      return fail("Ti sei già candidato a questo ingaggio", 409);
    }

    const participation = existing
      ? await prisma.participation.update({
          where: { id: existing.id },
          data: { status: "PENDING", message: data.message || null, respondedAt: null },
        })
      : await prisma.participation.create({
          data: { eventId: id, userId: g.user!.id, message: data.message || null },
        });

    await grantXp(g.user!.id, 5);
    await progressQuest(g.user!.id, "join_event");
    await notify({
      recipientId: event.organizerId,
      actorId: g.user!.id,
      type: "EVENT_REQUEST",
      body: `${g.user!.name} si è candidato a "${event.title}"`,
      entityId: event.id,
      entityUrl: `/dashboard/eventi/${event.id}`,
    });

    revalidatePath(`/eventi/${event.slug}`);
    return ok(participation, { status: 201 });
  });
}

/** Ritiro della candidatura da parte dell'artista. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "participate", limit: 20 });
    if (g.error) return g.error;
    const { id } = await params;

    const participation = await prisma.participation.findUnique({
      where: { eventId_userId: { eventId: id, userId: g.user!.id } },
      include: { event: { select: { slug: true } } },
    });
    if (!participation) return fail("Candidatura non trovata", 404);

    const eraConfermata = participation.status === "ACCEPTED";

    await prisma.participation.update({
      where: { id: participation.id },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });

    // Ritirarsi da un ingaggio già confermato toglie la voce che nella
    // reputazione pesa di più. Solo in quel caso: una candidatura in attesa
    // non aveva ancora dato punti a nessuno, e ricalcolare sarebbe una query
    // per niente sull'azione più frequente delle due.
    if (eraConfermata) await ricalcolaReputazione(g.user!.id);

    revalidatePath(`/eventi/${participation.event.slug}`);
    return ok({ status: "CANCELLED" });
  });
}

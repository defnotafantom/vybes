import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

async function ownedEvent(id: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true, organizerId: true, citySlug: true, status: true },
  });
  if (!event) return { event: null, error: fail("Ingaggio non trovato", 404) };
  if (event.organizerId !== userId) {
    return { event: null, error: fail("Solo l'organizzatore può modificare questo ingaggio", 403) };
  }
  return { event, error: null };
}

/** Rigenera tutte le pagine indicizzate che mostrano l'evento. */
function revalidateEvent(slug: string, citySlug: string, previousCitySlug?: string) {
  revalidatePath(`/eventi/${slug}`);
  revalidatePath("/eventi");
  revalidatePath("/mappa");
  revalidatePath(`/citta/${citySlug}`);
  revalidatePath(`/citta/${citySlug}/eventi`);
  if (previousCitySlug && previousCitySlug !== citySlug) {
    revalidatePath(`/citta/${previousCitySlug}`);
    revalidatePath(`/citta/${previousCitySlug}/eventi`);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "events-write", limit: 30 });
    if (g.error) return g.error;
    const { id } = await params;

    const check = await ownedEvent(id, g.user!.id);
    if (check.error) return check.error;

    const { data, error } = await parseBody(req, eventSchema);
    if (error) return error;

    const city = await prisma.city.findUnique({ where: { slug: data.citySlug } });
    if (!city) return fail("Città non riconosciuta", 422, { citySlug: "Seleziona una città dall'elenco" });

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        startsAt: data.startsAt,
        endsAt: data.endsAt ?? null,
        venueName: data.venueName || null,
        address: data.address || null,
        citySlug: city.slug,
        city: city.name,
        region: city.region,
        latitude: data.latitude,
        longitude: data.longitude,
        isPaid: data.isPaid,
        feeMin: data.feeMin ?? null,
        feeMax: data.feeMax ?? null,
        capacity: data.capacity ?? null,
        coverImage: data.coverImage || null,
      },
    });

    // Lo slug NON cambia: e' l'URL indicizzato, cambiarlo significherebbe
    // buttare via il posizionamento acquisito e generare un 404.
    await notifyParticipants(id, g.user!.id, `L'ingaggio "${updated.title}" è stato aggiornato`, `/eventi/${updated.slug}`);

    revalidateEvent(updated.slug, city.slug, check.event!.citySlug);
    return ok(updated);
  });
}

/**
 * "Elimina" un ingaggio.
 *
 * Se ci sono candidature l'evento viene annullato, non cancellato: la pagina
 * resta raggiungibile con lo stato CANCELLED (e in `noindex`), così chi ci
 * arriva da un link o dalla SERP capisce cos'è successo invece di trovare un
 * 404. Senza candidature si cancella davvero.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "events-write", limit: 20 });
    if (g.error) return g.error;
    const { id } = await params;

    const check = await ownedEvent(id, g.user!.id);
    if (check.error) return check.error;
    const event = check.event!;

    const participations = await prisma.participation.count({
      where: { eventId: id, status: { in: ["PENDING", "ACCEPTED"] } },
    });

    if (participations === 0) {
      await prisma.event.delete({ where: { id } });
      revalidateEvent(event.slug, event.citySlug);
      return ok({ deleted: true, cancelled: false });
    }

    await prisma.$transaction([
      prisma.event.update({ where: { id }, data: { status: "CANCELLED" } }),
      prisma.participation.updateMany({
        where: { eventId: id, status: { in: ["PENDING", "ACCEPTED"] } },
        data: { status: "CANCELLED", respondedAt: new Date() },
      }),
    ]);

    await notifyParticipants(
      id,
      g.user!.id,
      `L'ingaggio "${event.title}" è stato annullato dall'organizzatore`,
      `/eventi/${event.slug}`
    );

    revalidateEvent(event.slug, event.citySlug);
    return ok({ deleted: false, cancelled: true, notified: participations });
  });
}

async function notifyParticipants(eventId: string, actorId: string, body: string, url: string) {
  const participants = await prisma.participation.findMany({
    where: { eventId, status: { not: "REJECTED" } },
    select: { userId: true },
  });

  for (const p of participants) {
    await notify({
      recipientId: p.userId,
      actorId,
      type: "EVENT_REQUEST",
      body,
      entityId: eventId,
      entityUrl: url,
    });
  }
}

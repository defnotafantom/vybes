import { prisma } from "@/lib/prisma";
import { eventNuovoSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { uniqueSlug } from "@/lib/slug";
import { progressQuest, grantXp } from "@/lib/gamification";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "events-write", limit: 10 });
    if (g.error) return g.error;

    // `eventNuovoSchema` e non `eventSchema`: qui si crea, e un annuncio con
    // data passata non comparirebbe in nessun elenco. La modifica usa lo
    // schema senza quel vincolo — vedi la nota in `validations.ts`.
    const { data, error } = await parseBody(req, eventNuovoSchema);
    if (error) return error;

    const city = await prisma.city.findUnique({ where: { slug: data.citySlug } });
    if (!city) return fail("Città non riconosciuta", 422, { citySlug: "Seleziona una città dall'elenco" });

    // Lo slug include città e mese: URL leggibile e ricco di keyword.
    const monthYear = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(data.startsAt);
    const slug = await uniqueSlug(`${data.title} ${city.name} ${monthYear}`, async (s) =>
      Boolean(await prisma.event.findUnique({ where: { slug: s } }))
    );

    const event = await prisma.event.create({
      data: {
        slug,
        organizerId: g.user!.id,
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

    await grantXp(g.user!.id, 25);
    await progressQuest(g.user!.id, "first_event");

    // Rigenera subito le pagine indicizzate che devono mostrare l'evento.
    revalidatePath("/eventi");
    revalidatePath(`/citta/${city.slug}/eventi`);
    revalidatePath(`/citta/${city.slug}`);
    revalidatePath("/mappa");

    return ok(event, { status: 201 });
  });
}

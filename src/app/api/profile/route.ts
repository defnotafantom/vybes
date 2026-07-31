import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { toCsv } from "@/lib/slug";
import { syncProfileQuest } from "@/lib/gamification";
import { revalidatePath } from "next/cache";

export async function PATCH(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "profile", limit: 30 });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, profileSchema);
    if (error) return error;

    let city: { name: string; region: string; latitude: number; longitude: number } | null = null;
    if (data.citySlug) {
      city = await prisma.city.findUnique({
        where: { slug: data.citySlug },
        select: { name: true, region: true, latitude: true, longitude: true },
      });
      if (!city) return fail("Città non riconosciuta", 422, { citySlug: "Scegli una città dall'elenco" });
    }

    const user = await prisma.user.update({
      where: { id: g.user!.id },
      data: {
        name: data.name,
        // undefined = campo non toccato dal form; "" = rimozione esplicita.
        ...(data.image !== undefined ? { image: data.image || null } : {}),
        ...(data.cover !== undefined ? { cover: data.cover || null } : {}),
        headline: data.headline || null,
        bio: data.bio || null,
        disciplines: toCsv(data.disciplines),
        website: data.website || null,
        instagram: data.instagram || null,
        spotify: data.spotify || null,
        youtube: data.youtube || null,
        isPublic: data.isPublic,
        ...(city
          ? {
              citySlug: data.citySlug,
              city: city.name,
              region: city.region,
              latitude: city.latitude,
              longitude: city.longitude,
            }
          : { citySlug: null, city: null, region: null }),
      },
      select: { slug: true, citySlug: true },
    });

    await syncProfileQuest(g.user!.id);

    // Le pagine indicizzate che mostrano il profilo vanno rigenerate.
    revalidatePath(`/artisti/${user.slug}`);
    revalidatePath("/artisti");
    if (user.citySlug) revalidatePath(`/citta/${user.citySlug}/artisti`);

    return ok(user);
  });
}

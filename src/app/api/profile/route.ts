import { z } from "zod";
import bcrypt from "bcryptjs";
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

/**
 * Conferma della cancellazione.
 *
 * Chi ha una password la deve riscrivere; chi è entrato con Google non ce l'ha,
 * e a lui si chiede di digitare il proprio nome pubblico. In entrambi i casi
 * serve un gesto deliberato: una richiesta DELETE autenticata, da sola, la
 * scatenerebbe anche un link malevolo aperto in una scheda già loggata.
 */
const eliminaSchema = z.object({
  conferma: z.string().min(1, "Conferma richiesta"),
});

/**
 * Cancellazione dell'account — art. 17 GDPR.
 *
 * L'informativa prometteva questa funzione da prima che esistesse. È lo stesso
 * difetto del canonical sbagliato e della validazione dell'ambiente mai
 * invocata: un documento che descrive un comportamento che il codice non ha.
 * Qui però la promessa era anche un obbligo di legge.
 *
 * La cancellazione è definitiva e immediata, non differita: un periodo di
 * ripensamento andrebbe dichiarato nell'informativa, e dichiararlo significa
 * anche gestirlo. Meglio una regola semplice che si rispetta.
 *
 * Le relazioni con `onDelete: Cascade` — post, portfolio, candidature,
 * messaggi, notifiche — se ne vanno con l'utente. Lo schema è l'unico posto in
 * cui quella regola è scritta: ripeterla qui significherebbe doverla
 * aggiornare in due punti e scoprire troppo tardi che i due si sono scollati.
 */
export async function DELETE(req: Request) {
  return handle(async () => {
    // Limite basso: nessuno cancella il proprio account cinque volte al minuto,
    // e un tentativo ripetuto è un attacco a forza bruta sulla password.
    const g = await guard(req, { scope: "profile-delete", limit: 5 });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, eliminaSchema);
    if (error) return error;

    const me = await prisma.user.findUnique({
      where: { id: g.user!.id },
      select: { id: true, name: true, slug: true, citySlug: true, password: true },
    });
    if (!me) return fail("Account non trovato", 404);

    const valida = me.password
      ? await bcrypt.compare(data.conferma, me.password)
      : data.conferma.trim().toLowerCase() === me.name.trim().toLowerCase();

    if (!valida) {
      return fail(
        me.password ? "Password errata" : "Il nome digitato non corrisponde",
        403,
        { conferma: "Non corrisponde" }
      );
    }

    await prisma.user.delete({ where: { id: me.id } });

    // Le pagine indicizzate che mostravano il profilo vanno rigenerate subito:
    // altrimenti resterebbero servite dalla cache per un'ora dopo che la
    // persona ha chiesto di sparire.
    revalidatePath(`/artisti/${me.slug}`);
    revalidatePath("/artisti");
    if (me.citySlug) {
      revalidatePath(`/citta/${me.citySlug}`);
      revalidatePath(`/citta/${me.citySlug}/artisti`);
    }

    return ok({ eliminato: true });
  });
}

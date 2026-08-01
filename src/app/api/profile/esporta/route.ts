import { prisma } from "@/lib/prisma";
import { guard, fail, handle } from "@/lib/api";
import { fromCsv } from "@/lib/slug";

/**
 * Esportazione dei propri dati — art. 20 GDPR, diritto alla portabilità.
 *
 * "In un formato strutturato, di uso comune e leggibile da dispositivo
 * automatico", dice la norma. JSON lo è. Un PDF sarebbe leggibile da una
 * persona ma non da un programma, e la portabilità serve appunto a portare i
 * dati altrove, non a rileggerli.
 *
 * Contiene solo ciò che la persona ha fornito o generato. Restano fuori:
 *
 * - l'hash della password, che non è un dato utile a nessuno e la cui
 *   diffusione è solo un rischio;
 * - i messaggi ricevuti, perché appartengono anche a chi li ha scritti — il
 *   diritto alla portabilità non si estende ai dati altrui. Escono invece
 *   quelli inviati, che sono suoi;
 * - i dati derivati da nostre elaborazioni, come la reputazione: la norma
 *   copre i dati forniti dall'interessato, non le nostre inferenze. Li
 *   includiamo comunque perché nasconderli non gioverebbe a nessuno, ma il
 *   confine è questo.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "profile-export", limit: 5 });
    if (g.error) return g.error;

    const me = await prisma.user.findUnique({
      where: { id: g.user!.id },
      select: {
        email: true, name: true, slug: true, headline: true, bio: true,
        image: true, cover: true, city: true, region: true, disciplines: true,
        website: true, instagram: true, spotify: true, youtube: true,
        role: true, level: true, experience: true, reputation: true,
        isPublic: true, isVerified: true, emailVerified: true, createdAt: true,
        portfolioItems: {
          select: { title: true, description: true, mediaUrl: true, mediaType: true, year: true, isPublic: true, createdAt: true },
        },
        posts: { select: { content: true, createdAt: true } },
        comments: { select: { content: true, createdAt: true } },
        eventsCreated: {
          select: { title: true, description: true, startsAt: true, city: true, venueName: true, isPaid: true, feeMin: true, feeMax: true, status: true, createdAt: true },
        },
        participations: {
          select: { status: true, message: true, createdAt: true, event: { select: { title: true, startsAt: true, city: true } } },
        },
        sentMessages: {
          select: { content: true, createdAt: true },
        },
        _count: { select: { followers: true, following: true } },
      },
    });

    if (!me) return fail("Account non trovato", 404);

    const { disciplines, _count, ...resto } = me;

    const esportazione = {
      esportatoIl: new Date().toISOString(),
      informativa:
        "Copia dei dati del tuo account Vybes. Non contiene la password (salvata solo come hash non reversibile) né i messaggi ricevuti, che appartengono anche a chi li ha scritti.",
      profilo: { ...resto, disciplines: fromCsv(disciplines) },
      seguito: { follower: _count.followers, seguiti: _count.following },
    };

    // `attachment` fa scaricare il file invece di mostrarlo: un JSON aperto nel
    // browser è illeggibile, e il punto è portarselo via.
    return new Response(JSON.stringify(esportazione, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="vybes-${me.slug}-${new Date().toISOString().slice(0, 10)}.json"`,
        // Dati personali: mai in nessuna cache, né del browser né dei proxy.
        "Cache-Control": "no-store, private",
      },
    });
  });
}

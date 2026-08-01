import { prisma } from "@/lib/prisma";
import { searchSchema } from "@/lib/validations";
import { guard, ok, fail, handle } from "@/lib/api";
import { fromCsv } from "@/lib/slug";
import { PROFILO_PUBBLICO } from "@/lib/visibilita";

/** Ricerca trasversale usata dalla barra di ricerca e dall'autocomplete. */
export async function GET(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "search", limit: 60, requireAuth: false });
    if (g.error) return g.error;

    const url = new URL(req.url);
    const parsed = searchSchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      type: url.searchParams.get("type") ?? "all",
    });
    if (!parsed.success) return fail("Query troppo corta (minimo 2 caratteri)", 422);

    const { q, type } = parsed.data;
    const want = (t: string) => type === "all" || type === t;

    const [artists, events, posts, portfolio] = await Promise.all([
      want("artists")
        ? prisma.user.findMany({
            where: {
              ...PROFILO_PUBBLICO,
              OR: [{ name: { contains: q, mode: "insensitive" } },
                { headline: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },],
            },
            take: 8,
            select: { id: true, slug: true, name: true, headline: true, image: true, city: true, disciplines: true },
          })
        : [],
      want("events")
        ? prisma.event.findMany({
            where: {
              isPublic: true,
              status: "PUBLISHED",
              OR: [{ title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },],
            },
            orderBy: { startsAt: "asc" },
            take: 8,
            select: { slug: true, title: true, city: true, startsAt: true, isPaid: true, feeMin: true },
          })
        : [],
      want("posts")
        ? prisma.post.findMany({
            where: { isPublic: true, content: { contains: q, mode: "insensitive" } },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: { id: true, content: true, author: { select: { slug: true, name: true } } },
          })
        : [],
      want("portfolio")
        ? prisma.portfolioItem.findMany({
            where: { isPublic: true, title: { contains: q, mode: "insensitive" } },
            take: 8,
            select: { slug: true, title: true, mediaType: true, user: { select: { slug: true, name: true } } },
          })
        : [],
    ]);

    return ok({
      artists: artists.map((a) => ({ ...a, disciplines: fromCsv(a.disciplines) })),
      events,
      posts,
      portfolio,
    });
  });
}

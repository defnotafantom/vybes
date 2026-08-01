import { prisma } from "@/lib/prisma";
import { renderUrlset, xmlResponse } from "@/lib/sitemap-xml";
import { isProfileIndexable } from "@/lib/profile-quality";

export const revalidate = 3600;

export async function GET() {
  const artists = await prisma.user.findMany({
    where: { isPublic: true, emailVerified: { not: null } },
    select: {
      slug: true,
      updatedAt: true,
      // Serve a decidere se il profilo ha abbastanza contenuto da meritare
      // l'indice. Prima la sitemap li dichiarava tutti, e gli account di
      // prova finivano davanti a Google insieme ai profili veri.
      bio: true,
      disciplines: true,
      _count: { select: { portfolioItems: { where: { isPublic: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 45000,
  });

  // Il filtro è in JavaScript e non nella query perché la regola guarda la
  // lunghezza della biografia, che Prisma non sa confrontare in `where` senza
  // scendere a SQL grezzo. Il costo è nullo: le righe vanno lette comunque
  // tutte per costruire l'elenco.
  const degni = artists.filter((a) =>
    isProfileIndexable({
      bio: a.bio,
      disciplines: a.disciplines,
      portfolioCount: a._count.portfolioItems,
    })
  );

  return xmlResponse(
    renderUrlset(
      degni.map((a) => ({
        loc: `/artisti/${a.slug}`,
        lastmod: a.updatedAt,
        changefreq: "weekly" as const,
        priority: 0.7,
      }))
    )
  );
}

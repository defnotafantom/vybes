import { prisma } from "@/lib/prisma";
import { DISCIPLINES, MIN_ITEMS_FOR_INDEX } from "@/lib/constants";
import { renderUrlset, xmlResponse, type SitemapUrl } from "@/lib/sitemap-xml";
import { fromCsv } from "@/lib/slug";

export const revalidate = 86400;

/**
 * Directory locale in sitemap.
 *
 * Una città entra solo se ha contenuto reale. Segnalare a Google 200 pagine
 * che dicono "nessun profilo" non porta traffico: peggiora la valutazione
 * complessiva del sito e riduce la frequenza di scansione anche delle pagine
 * buone. Meglio venti URL pieni che duecento vuoti.
 *
 * La soglia si regola con MIN_ITEMS_FOR_INDEX.
 */
export async function GET() {
  const [cities, artistCounts, eventCounts, artists] = await Promise.all([
    prisma.city.findMany({ select: { slug: true } }),
    prisma.user.groupBy({
      by: ["citySlug"],
      where: { isPublic: true, role: "ARTIST", citySlug: { not: null } },
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ["citySlug"],
      where: { isPublic: true, status: "PUBLISHED", startsAt: { gte: new Date() } },
      _count: { _all: true },
    }),
    // Serve a sapere quali coppie città×disciplina hanno davvero profili.
    prisma.user.findMany({
      where: { isPublic: true, role: "ARTIST", citySlug: { not: null } },
      select: { citySlug: true, disciplines: true },
    }),
  ]);

  const artistsBy = new Map<string, number>(
    artistCounts.flatMap((c) => (c.citySlug ? [[c.citySlug, c._count._all] as [string, number]] : []))
  );
  const eventsBy = new Map<string, number>(
    eventCounts.flatMap((c) => (c.citySlug ? [[c.citySlug, c._count._all] as [string, number]] : []))
  );

  // Chiave "citta|disciplina" -> quanti profili
  const byPair = new Map<string, number>();
  for (const a of artists) {
    if (!a.citySlug) continue;
    for (const d of fromCsv(a.disciplines)) {
      const key = `${a.citySlug}|${d}`;
      byPair.set(key, (byPair.get(key) ?? 0) + 1);
    }
  }

  const urls: SitemapUrl[] = [];

  for (const city of cities) {
    const nArtists = artistsBy.get(city.slug) ?? 0;
    const nEvents = eventsBy.get(city.slug) ?? 0;

    // L'hub cittadino basta che abbia qualcosa, artisti o ingaggi.
    if (nArtists + nEvents >= MIN_ITEMS_FOR_INDEX) {
      urls.push({ loc: `/citta/${city.slug}`, priority: 0.8, changefreq: "weekly" });
    }
    if (nArtists >= MIN_ITEMS_FOR_INDEX) {
      urls.push({ loc: `/citta/${city.slug}/artisti`, priority: 0.8, changefreq: "daily" });
    }
    if (nEvents >= MIN_ITEMS_FOR_INDEX) {
      urls.push({ loc: `/citta/${city.slug}/eventi`, priority: 0.8, changefreq: "hourly" });
    }

    for (const d of DISCIPLINES) {
      if ((byPair.get(`${city.slug}|${d.slug}`) ?? 0) >= MIN_ITEMS_FOR_INDEX) {
        urls.push({
          loc: `/citta/${city.slug}/artisti/${d.slug}`,
          priority: 0.6,
          changefreq: "weekly",
        });
      }
    }
  }

  return xmlResponse(renderUrlset(urls));
}

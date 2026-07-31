import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonld";

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: "Artisti e ingaggi città per città",
  description:
    "La directory locale di Vybes: scegli la tua città e trova artisti disponibili e ingaggi aperti nella tua zona, dalla Lombardia alla Sicilia.",
  path: "/citta",
  keywords: ["artisti per città", "ingaggi locali", "musicisti nella mia città"],
});

export default async function CittaIndexPage() {
  const cities = await prisma.city.findMany({ orderBy: { population: "desc" } });

  // Conteggi in due query aggregate invece di N+1 sulle città.
  const [artistCounts, eventCounts] = await Promise.all([
    prisma.user.groupBy({
      by: ["citySlug"],
      where: { isPublic: true, citySlug: { not: null } },
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ["citySlug"],
      where: { isPublic: true, status: "PUBLISHED", startsAt: { gte: new Date() } },
      _count: { _all: true },
    }),
  ]);

  const toMap = (rows: { citySlug: string | null; _count: { _all: number } }[]) =>
    new Map<string, number>(
      rows.flatMap((r) => (r.citySlug ? [[r.citySlug, r._count._all] as [string, number]] : []))
    );

  const artistBy = toMap(artistCounts);
  const eventBy = toMap(eventCounts);

  type CityRow = (typeof cities)[number];
  const byRegion: Record<string, CityRow[]> = {};
  for (const c of cities) (byRegion[c.region] ??= []).push(c);

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Città", path: "/citta" }]} />
      <JsonLd
        data={itemListJsonLd(
          cities.map((c) => ({ name: c.name, path: `/citta/${c.slug}` })),
          "Città coperte da Vybes"
        )}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">Artisti e ingaggi città per città</h1>
      <p className="mt-3 max-w-2xl muted">
        Ogni città ha la sua pagina con i profili attivi in zona e le opportunità aperte.
        Scegli la tua per iniziare.
      </p>

      <div className="mt-10 space-y-10">
        {Object.entries(byRegion).map(([region, list]) => (
          <section key={region}>
            <h2 className="text-lg font-bold">{region}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.slug}>
                  <Link href={`/citta/${c.slug}`} className="card block hover:border-brand-400">
                    <span className="font-semibold">{c.name}</span>
                    <span className="mt-1 block text-sm muted">
                      {artistBy.get(c.slug) ?? 0} artisti · {eventBy.get(c.slug) ?? 0} ingaggi aperti
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

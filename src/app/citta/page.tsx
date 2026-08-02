import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonld";
import { PROFILO_PUBBLICO } from "@/lib/visibilita";
import { Suspense } from "react";
import { SkeletonCitta } from "@/components/SkeletonCitta";

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: "Artisti e ingaggi città per città",
  description:
    "La directory locale di Vybes: scegli la tua città e trova artisti disponibili e ingaggi aperti nella tua zona, dalla Lombardia alla Sicilia.",
  path: "/citta",
  keywords: ["artisti per città", "ingaggi locali", "musicisti nella mia città"],
});

/** Il confine di Suspense sta qui e non in un `loading.tsx`: vedi ADR-028. */
export default function CittaIndexPage() {
  return (
    <Suspense fallback={<SkeletonCitta />}>
      <Elenco />
    </Suspense>
  );
}

async function Elenco() {
  const cities = await prisma.city.findMany({ orderBy: { population: "desc" } });

  // Conteggi in due query aggregate invece di N+1 sulle città.
  const [artistCounts, eventCounts] = await Promise.all([
    prisma.user.groupBy({
      by: ["citySlug"],
      where: { ...PROFILO_PUBBLICO, citySlug: { not: null } },
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

  const totalArtists = [...artistBy.values()].reduce((a, b) => a + b, 0);
  const totalEvents = [...eventBy.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <JsonLd
        data={itemListJsonLd(
          cities.map((c) => ({ name: c.name, path: `/citta/${c.slug}` })),
          "Città coperte da Vybes"
        )}
      />

      <PageHero
        breadcrumbs={[{ name: "Città", path: "/citta" }]}
        eyebrow="Directory locale"
        title="Artisti e ingaggi"
        highlight="città per città"
        lead="Chi cerca un artista lo cerca quasi sempre vicino a casa. Ogni città ha la sua pagina, con i profili attivi in zona e le opportunità aperte nei dintorni."
        stats={[
          { label: "Città coperte", value: cities.length },
          { label: "Regioni", value: Object.keys(byRegion).length },
          { label: "Artisti in directory", value: totalArtists },
          { label: "Ingaggi aperti", value: totalEvents },
        ]}
      />

      <div className="container-page space-y-16 py-14">
        {Object.entries(byRegion).map(([region, list]) => (
          <section key={region}>
            {/* Il titolo di regione resta agganciato in alto mentre si scorre
                la sua sezione: con venti regioni, senza questo si perde la
                cognizione di dove ci si trova nell'elenco. */}
            <h2
              className="sticky top-16 z-10 -mx-4 px-4 py-3 text-fluid-lg font-bold backdrop-blur-md
                         sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              // I margini negativi replicano esattamente il padding di
              // .container-page, così lo sfondo sfocato arriva ai bordi e le
              // schede non spuntano ai lati mentre scorrono sotto.
              style={{ background: "rgb(var(--bg) / 0.82)" }}
            >
              {region}
              <span className="ml-3 text-fluid-xs font-medium text-ink-faint">
                {list.length} città
              </span>
            </h2>

            <ul className="stagger mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => {
                const artists = artistBy.get(c.slug) ?? 0;
                const events = eventBy.get(c.slug) ?? 0;

                return (
                  <li key={c.slug}>
                    <Link
                      href={`/citta/${c.slug}`}
                      className="card-interactive border-glow group flex h-full flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-fluid-lg font-bold tracking-tight transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {c.name}
                        </span>
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 translate-y-0.5 text-ink-faint opacity-0 transition-all duration-250 group-hover:translate-y-0 group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </div>

                      {/* Due numeri affiancati invece di una riga di testo:
                          il confronto tra città si fa con l'occhio. */}
                      <dl className="mt-5 flex gap-6">
                        <div>
                          <dd className="text-fluid-lg font-bold tabular-nums">{artists}</dd>
                          <dt className="text-fluid-xs uppercase tracking-wider text-ink-faint">
                            artisti
                          </dt>
                        </div>
                        <div>
                          <dd
                            className={`text-fluid-lg font-bold tabular-nums ${
                              events > 0 ? "text-accent-400" : ""
                            }`}
                          >
                            {events}
                          </dd>
                          <dt className="text-fluid-xs uppercase tracking-wider text-ink-faint">
                            ingaggi
                          </dt>
                        </div>
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

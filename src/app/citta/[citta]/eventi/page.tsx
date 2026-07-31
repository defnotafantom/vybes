import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonld";

export const revalidate = 900;

export async function generateStaticParams() {
  const cities = await prisma.city.findMany({ select: { slug: true } });
  return cities.map((c) => ({ citta: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ citta: string }> }): Promise<Metadata> {
  const { citta } = await params;
  const city = await prisma.city.findUnique({ where: { slug: citta } });
  if (!city) return buildMetadata({ title: "Città non trovata", path: `/citta/${citta}/eventi`, noindex: true });

  return buildMetadata({
    title: `Ingaggi e casting a ${city.name}`,
    description: `Opportunità aperte per artisti a ${city.name}: concerti, casting, workshop e contest con data, luogo e compenso. Candidati direttamente all'organizzatore.`,
    path: `/citta/${city.slug}/eventi`,
    keywords: [
      `ingaggi ${city.name}`,
      `casting ${city.name}`,
      `concerti ${city.name}`,
      `locali musica dal vivo ${city.name}`,
    ],
  });
}

export default async function CityEventsPage({ params }: { params: Promise<{ citta: string }> }) {
  const { citta } = await params;
  const city = await prisma.city.findUnique({ where: { slug: citta } });
  if (!city) notFound();

  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { isPublic: true, status: "PUBLISHED", citySlug: city.slug, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 30,
      select: {
        slug: true, title: true, description: true, coverImage: true, category: true,
        startsAt: true, city: true, venueName: true, isPaid: true, feeMin: true, feeMax: true,
      },
    }),
    prisma.event.findMany({
      where: { isPublic: true, citySlug: city.slug, startsAt: { lt: new Date() } },
      orderBy: { startsAt: "desc" },
      take: 8,
      select: { slug: true, title: true, startsAt: true },
    }),
  ]);

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        items={[
          { name: "Città", path: "/citta" },
          { name: city.name, path: `/citta/${city.slug}` },
          { name: "Ingaggi", path: `/citta/${city.slug}/eventi` },
        ]}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">Ingaggi e casting a {city.name}</h1>
      <p className="mt-3 max-w-2xl muted">
        {upcoming.length} opportunità aperte. Sei un artista di {city.name}?{" "}
        <Link href={`/citta/${city.slug}/artisti`} className="text-brand-600 hover:underline">
          Vedi chi c&apos;è in zona
        </Link>.
      </p>

      {upcoming.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={`Nessun ingaggio aperto a ${city.name}`}
            body="Nuove opportunità vengono pubblicate ogni settimana. Nel frattempo guarda gli ingaggi in tutta Italia."
            ctaLabel="Tutti gli ingaggi"
            ctaHref="/eventi"
          />
        </div>
      ) : (
        <>
          <JsonLd
            data={itemListJsonLd(
              upcoming.map((e) => ({ name: e.title, path: `/eventi/${e.slug}` })),
              `Ingaggi a ${city.name}`
            )}
          />
          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e, i) => (
              <EventCard key={e.slug} event={e} priority={i < 3} />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold">Archivio eventi a {city.name}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {past.map((e) => (
              <li key={e.slug}>
                <Link href={`/eventi/${e.slug}`} className="muted hover:text-brand-600">
                  {e.title} — {e.startsAt.toLocaleDateString("it-IT")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

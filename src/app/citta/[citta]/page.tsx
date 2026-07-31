import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArtistCard } from "@/components/ArtistCard";
import { EventCard } from "@/components/EventCard";
import { DISCIPLINES } from "@/lib/constants";
import { fromCsv } from "@/lib/slug";
import { StaticMap } from "@/components/StaticMap";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/jsonld";

export const revalidate = 3600;

export async function generateStaticParams() {
  const cities = await prisma.city.findMany({ select: { slug: true } });
  return cities.map((c) => ({ citta: c.slug }));
}

async function getCity(slug: string) {
  return prisma.city.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Promise<{ citta: string }> }): Promise<Metadata> {
  const { citta } = await params;
  const city = await getCity(citta);
  if (!city) return buildMetadata({ title: "Città non trovata", path: `/citta/${citta}`, noindex: true });

  return buildMetadata({
    title: `Artisti e ingaggi a ${city.name}`,
    description: `Trova artisti disponibili a ${city.name} e scopri gli ingaggi aperti in zona: concerti, casting e workshop in ${city.region}. Candidature dirette, nessuna commissione.`,
    path: `/citta/${city.slug}`,
    keywords: [
      `artisti ${city.name}`,
      `musicisti ${city.name}`,
      `ingaggi ${city.name}`,
      `casting ${city.name}`,
      `musica dal vivo ${city.name}`,
    ],
  });
}

export default async function CityHubPage({ params }: { params: Promise<{ citta: string }> }) {
  const { citta } = await params;
  const city = await getCity(citta);
  if (!city) notFound();

  const [artists, events, artistTotal, eventTotal] = await Promise.all([
    prisma.user.findMany({
      where: { isPublic: true, citySlug: city.slug, role: "ARTIST" },
      orderBy: { reputation: "desc" },
      take: 6,
      select: {
        slug: true, name: true, headline: true, image: true, city: true,
        disciplines: true, level: true, isVerified: true,
      },
    }),
    prisma.event.findMany({
      where: { isPublic: true, status: "PUBLISHED", citySlug: city.slug, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 6,
      select: {
        slug: true, title: true, description: true, coverImage: true, category: true,
        startsAt: true, city: true, venueName: true, isPaid: true, feeMin: true, feeMax: true,
      },
    }),
    prisma.user.count({ where: { isPublic: true, citySlug: city.slug, role: "ARTIST" } }),
    prisma.event.count({
      where: { isPublic: true, status: "PUBLISHED", citySlug: city.slug, startsAt: { gte: new Date() } },
    }),
  ]);

  const faqs = [
    {
      q: `Come trovo un artista a ${city.name}?`,
      a: `Apri l'elenco degli artisti di ${city.name}, filtra per disciplina (cantanti, DJ, band, ballerini) e contatta direttamente il profilo che ti interessa. Non serve passare da un'agenzia.`,
    },
    {
      q: `Quanto costa ingaggiare un artista a ${city.name}?`,
      a: `Il cachet lo definiscono artista e organizzatore: negli annunci pubblicati su Vybes il compenso è sempre indicato in chiaro, così sai da subito se l'ingaggio fa per te.`,
    },
    {
      q: `Sono un artista di ${city.name}: come mi faccio trovare?`,
      a: `Crea il profilo, indica ${city.name} come città e carica il portfolio. Il profilo diventa una pagina pubblica indicizzata e compare in questa directory.`,
    },
  ];

  return (
    <div className="container-page py-10">
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs items={[{ name: "Città", path: "/citta" }, { name: city.name, path: `/citta/${city.slug}` }]} />

      <h1 className="text-3xl font-bold sm:text-4xl">Artisti e ingaggi a {city.name}</h1>
      <p className="mt-4 max-w-3xl leading-relaxed muted">{city.intro}</p>

      <dl className="mt-8 flex flex-wrap gap-10 text-sm">
        <div><dt className="muted">Artisti in zona</dt><dd className="text-2xl font-bold">{artistTotal}</dd></div>
        <div><dt className="muted">Ingaggi aperti</dt><dd className="text-2xl font-bold">{eventTotal}</dd></div>
        <div><dt className="muted">Regione</dt><dd className="text-2xl font-bold">{city.region}</dd></div>
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/citta/${city.slug}/artisti`} className="btn-primary">
          Tutti gli artisti di {city.name}
        </Link>
        <Link href={`/citta/${city.slug}/eventi`} className="btn-ghost">
          Ingaggi a {city.name}
        </Link>
      </div>

      {artists.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold">Artisti in evidenza a {city.name}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <ArtistCard key={a.slug} artist={{ ...a, disciplines: fromCsv(a.disciplines) }} />
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold">Prossimi ingaggi a {city.name}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* Link long tail: una pagina per ogni combinazione citta' x disciplina */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold">Cerca per disciplina a {city.name}</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {DISCIPLINES.map((d) => (
            <li key={d.slug}>
              <Link href={`/citta/${city.slug}/artisti/${d.slug}`} className="btn-ghost">
                {d.plural} a {city.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Domande frequenti</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="card">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-3 text-sm muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <StaticMap latitude={city.latitude} longitude={city.longitude} label={city.name} zoomDelta={0.08} />
      </section>
    </div>
  );
}

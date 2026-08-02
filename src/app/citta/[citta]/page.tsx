import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
import { ARTISTA_PUBBLICO } from "@/lib/visibilita";

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
      where: { ...ARTISTA_PUBBLICO, citySlug: city.slug },
      orderBy: { reputation: "desc" },
      take: 6,
      select: {
        slug: true, name: true, headline: true, image: true, city: true,
        disciplines: true, reputation: true, isVerified: true,
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
    prisma.user.count({ where: { ...ARTISTA_PUBBLICO, citySlug: city.slug } }),
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
    <>
      <JsonLd data={faqJsonLd(faqs)} />

      {/* ─────────────────────────── INTESTAZIONE ─────────────────────────── */}
      <header className="relative isolate overflow-hidden border-b">
        <div className="mesh-hero opacity-50" aria-hidden="true" />

        <div className="container-page pb-14 pt-8">
          <Breadcrumbs
            items={[
              { name: "Città", path: "/citta" },
              { name: city.name, path: `/citta/${city.slug}` },
            ]}
          />

          <p className="eyebrow">{city.region}</p>
          <h1 className="mt-3 max-w-3xl text-fluid-3xl">
            Artisti e ingaggi a <span className="text-gradient">{city.name}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-fluid-base leading-relaxed text-ink-muted">
            {city.intro}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={`/citta/${city.slug}/artisti`} className="btn-primary">
              Tutti gli artisti di {city.name}
            </Link>
            <Link href={`/citta/${city.slug}/eventi`} className="btn-ghost">
              Ingaggi a {city.name}
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────── NUMERI ─────────────────────────── */}
      <section className="border-b bg-surface-sunken">
        <dl className="container-page grid grid-cols-2 sm:grid-cols-3">
          {[
            { label: "Artisti in zona", value: artistTotal },
            { label: "Ingaggi aperti", value: eventTotal },
            { label: "Regione", value: city.region },
          ].map((s) => (
            <div key={s.label} className="py-6">
              <dd className="text-fluid-2xl font-bold tabular-nums">{s.value}</dd>
              <dt className="mt-0.5 text-fluid-xs uppercase tracking-wider text-ink-faint">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="container-page space-y-20 py-16">
        {artists.length > 0 && (
          <section>
            <div className="reveal">
              <p className="eyebrow">Chi c&apos;è</p>
              <h2 className="mt-2 text-fluid-2xl">Artisti in evidenza a {city.name}</h2>
            </div>
            <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((a) => (
                <ArtistCard key={a.slug} artist={{ ...a, disciplines: fromCsv(a.disciplines) }} />
              ))}
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section>
            <div className="reveal">
              <p className="eyebrow">Opportunità</p>
              <h2 className="mt-2 text-fluid-2xl">Prossimi ingaggi a {city.name}</h2>
            </div>
            <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.slug} event={e} />
              ))}
            </div>
          </section>
        )}

        {/* Link long tail: una pagina per ogni combinazione città × disciplina.
            È la struttura che intercetta ricerche come "DJ a Milano". */}
        <section>
          <p className="eyebrow">Per disciplina</p>
          <h2 className="mt-2 text-fluid-2xl">Cerca per disciplina a {city.name}</h2>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DISCIPLINES.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/citta/${city.slug}/artisti/${d.slug}`}
                  className="border-glow group flex items-center justify-between rounded-xl border px-4 py-3.5 text-fluid-sm font-medium transition-all hover:-translate-y-0.5"
                >
                  {d.plural} a {city.name}
                  <ArrowRight
                    className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Domande frequenti</p>
            <h2 className="mt-2 text-fluid-2xl">Come funziona a {city.name}</h2>

            <div className="mt-8 divide-y border-y">
              {faqs.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-fluid-sm font-semibold transition-colors marker:hidden group-hover:text-brand-400">
                    {f.q}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-fluid-lg font-light text-ink-faint transition-transform duration-250 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-fluid-sm leading-relaxed text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>

          <StaticMap
            latitude={city.latitude}
            longitude={city.longitude}
            label={city.name}
            zoomDelta={0.08}
          />
        </section>
      </div>
    </>
  );
}

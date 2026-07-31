import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { SITE, DISCIPLINES } from "@/lib/constants";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/jsonld";
import { ArtistCard } from "@/components/ArtistCard";
import { EventCard } from "@/components/EventCard";
import { fromCsv } from "@/lib/slug";

// Rigenerata ogni 10 minuti: HTML statico servito dalla CDN, dati freschi.
export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    "Trova artisti in tutta Italia o pubblica un ingaggio in due minuti. Musicisti, DJ, band, ballerini e performer con portfolio e disponibilità.",
  path: "/",
  keywords: [
    "trovare artisti",
    "ingaggiare musicisti",
    "casting artisti Italia",
    "musica dal vivo locali",
    "piattaforma artisti",
  ],
});

const FAQ = [
  {
    q: "Quanto costa usare Vybes?",
    a: "Creare il profilo, pubblicare il portfolio e candidarsi agli ingaggi è gratuito per gli artisti. Gli organizzatori pubblicano annunci senza commissioni sul cachet.",
  },
  {
    q: "Come faccio a trovare artisti nella mia città?",
    a: "Usa la directory locale: ogni città ha una pagina dedicata con i profili attivi in zona, filtrabili per disciplina, e la mappa degli ingaggi aperti nel raggio scelto.",
  },
  {
    q: "Chi può pubblicare un ingaggio?",
    a: "Locali, agenzie, festival e organizzatori registrati come recruiter. Ogni annuncio indica data, luogo, compenso e numero di posti.",
  },
  {
    q: "I profili sono verificati?",
    a: "Ogni account richiede la verifica dell'email. I profili con portfolio completo e ingaggi conclusi ottengono il badge verificato.",
  },
];

export default async function HomePage() {
  const [featuredArtists, upcomingEvents, stats] = await Promise.all([
    prisma.user.findMany({
      where: { isPublic: true, role: "ARTIST" },
      orderBy: [{ reputation: "desc" }, { experience: "desc" }],
      take: 6,
      select: {
        slug: true, name: true, headline: true, image: true, city: true,
        disciplines: true, level: true, isVerified: true,
      },
    }),
    prisma.event.findMany({
      where: { isPublic: true, status: "PUBLISHED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
      select: {
        slug: true, title: true, description: true, coverImage: true, category: true,
        startsAt: true, city: true, venueName: true, isPaid: true, feeMin: true, feeMax: true,
      },
    }),
    Promise.all([
      prisma.user.count({ where: { isPublic: true, role: "ARTIST" } }),
      prisma.event.count({ where: { isPublic: true, status: "PUBLISHED" } }),
      prisma.city.count(),
    ]),
  ]);

  const [artistCount, eventCount, cityCount] = stats;

  return (
    <>
      <JsonLd data={faqJsonLd(FAQ)} />

      <section className="container-page py-16 sm:py-24">
        {/* Un solo H1 per pagina, con la keyword primaria */}
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Trova artisti. Trova ingaggi.{" "}
          <span className="text-gradient">Senza intermediari.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg muted">
          Vybes collega musicisti, DJ, band, ballerini e performer con i locali, i festival e le
          agenzie che li cercano. Portfolio pubblico, ingaggi geolocalizzati, candidature dirette.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/registrati?ruolo=artista" className="btn-primary px-6 py-3 text-base">
            Sono un artista
          </Link>
          <Link href="/registrati?ruolo=recruiter" className="btn-ghost px-6 py-3 text-base">
            Cerco artisti
          </Link>
        </div>
        <dl className="mt-12 flex flex-wrap gap-10 text-sm">
          <div><dt className="muted">Artisti</dt><dd className="text-2xl font-bold">{artistCount}</dd></div>
          <div><dt className="muted">Ingaggi aperti</dt><dd className="text-2xl font-bold">{eventCount}</dd></div>
          <div><dt className="muted">Città coperte</dt><dd className="text-2xl font-bold">{cityCount}</dd></div>
        </dl>
      </section>

      {featuredArtists.length > 0 && (
        <section className="container-page py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Artisti in evidenza</h2>
            <Link href="/artisti" className="text-sm text-brand-600 hover:underline">
              Vedi tutti gli artisti
            </Link>
          </div>
          <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredArtists.map((a, i) => (
              <ArtistCard
                key={a.slug}
                priority={i < 3}
                artist={{ ...a, disciplines: fromCsv(a.disciplines) }}
              />
            ))}
          </div>
        </section>
      )}

      {upcomingEvents.length > 0 && (
        <section className="container-page py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Prossimi ingaggi</h2>
            <Link href="/eventi" className="text-sm text-brand-600 hover:underline">
              Tutti gli ingaggi
            </Link>
          </div>
          <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* Hub di link interni: distribuisce PageRank verso le pagine long tail */}
      <section className="container-page py-12">
        <h2 className="text-2xl font-bold">Cerca per disciplina</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {DISCIPLINES.map((d) => (
            <li key={d.slug}>
              <Link href={`/artisti?disciplina=${d.slug}`} className="btn-ghost">
                {d.plural}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page py-12">
        <h2 className="text-2xl font-bold">Domande frequenti</h2>
        <div className="mt-6 space-y-4">
          {FAQ.map((f) => (
            <details key={f.q} className="card group open:shadow-raised">
              <summary className="cursor-pointer list-none font-medium transition-colors marker:hidden group-hover:text-brand-600">{f.q}</summary>
              <p className="mt-3 text-sm muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

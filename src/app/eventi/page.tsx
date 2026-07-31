import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/constants";
import { EventCard } from "@/components/EventCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonld";

export const revalidate = 300;
const PER_PAGE = 18;

type Search = { page?: string; categoria?: string; citta?: string; quando?: string };

function categoryFromSlug(slug?: string): EventCategory | undefined {
  if (!slug) return undefined;
  const entry = Object.entries(EVENT_CATEGORIES).find(([, v]) => v.slug === slug);
  return entry?.[0] as EventCategory | undefined;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = categoryFromSlug(sp.categoria);
  const page = Number(sp.page ?? 1);
  const label = cat ? EVENT_CATEGORIES[cat].plural : "Ingaggi e casting";

  return buildMetadata({
    title: `${label} per artisti in Italia${page > 1 ? ` — pagina ${page}` : ""}`,
    description: cat
      ? `${EVENT_CATEGORIES[cat].plural} aperti in tutta Italia: data, luogo, compenso e candidatura diretta all'organizzatore.`
      : "Tutti gli ingaggi aperti su Vybes: concerti, casting, workshop e contest per musicisti, DJ, band e performer in Italia.",
    path: cat ? `/eventi?categoria=${EVENT_CATEGORIES[cat].slug}` : "/eventi",
    noindex: page > 1,
  });
}

export default async function EventiPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const cat = categoryFromSlug(sp.categoria);

  const where = {
    isPublic: true,
    status: "PUBLISHED",
    startsAt: { gte: new Date() },
    ...(cat ? { category: cat } : {}),
    ...(sp.citta ? { citySlug: sp.citta } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        slug: true, title: true, description: true, coverImage: true, category: true,
        startsAt: true, city: true, venueName: true, isPaid: true, feeMin: true, feeMax: true,
      },
    }),
    prisma.event.count({ where }),
  ]);

  const heading = cat ? `${EVENT_CATEGORIES[cat].plural} per artisti` : "Ingaggi aperti per artisti";
  const basePath = cat ? `/eventi?categoria=${EVENT_CATEGORIES[cat].slug}` : "/eventi";

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Ingaggi", path: "/eventi" }]} />
      <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
      <p className="mt-3 max-w-2xl muted">
        {total} opportunità aperte in Italia. Guarda anche la{" "}
        <Link href="/mappa" className="text-brand-600 hover:underline">mappa degli ingaggi</Link>.
      </p>

      <nav aria-label="Filtra per categoria" className="mt-6 flex flex-wrap gap-2">
        <Link href="/eventi" className={cat ? "btn-ghost" : "btn-primary"}>Tutti</Link>
        {Object.entries(EVENT_CATEGORIES).map(([key, v]) => (
          <Link key={key} href={`/eventi?categoria=${v.slug}`} className={cat === key ? "btn-primary" : "btn-ghost"}>
            {v.plural}
          </Link>
        ))}
      </nav>

      {events.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nessun ingaggio aperto"
            body="Al momento non ci sono opportunità con questi filtri. Riprova tra poco o allarga la ricerca."
            ctaLabel="Tutti gli ingaggi"
            ctaHref="/eventi"
          />
        </div>
      ) : (
        <>
          <JsonLd data={itemListJsonLd(events.map((e) => ({ name: e.title, path: `/eventi/${e.slug}` })), heading)} />
          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e, i) => (
              <EventCard key={e.slug} event={e} priority={i < 3} />
            ))}
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath={basePath} />
        </>
      )}
    </div>
  );
}

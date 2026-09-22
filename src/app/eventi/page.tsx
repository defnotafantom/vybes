import type { Metadata } from "next";
import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/constants";
import { EventCard } from "@/components/EventCard";
import { PageHero } from "@/components/PageHero";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonld";
import { Suspense } from "react";
import { SkeletonEventi } from "@/components/SkeletonEventi";
import { ORE_BREVE } from "@/lib/ingaggi";

export const revalidate = 300;
const PER_PAGE = 18;

type Search = {
  page?: string;
  categoria?: string;
  citta?: string;
  quando?: string;
  /** `1` per vedere solo gli ingaggi brevi. */
  brevi?: string;
};

function categoryFromSlug(slug?: string): EventCategory | undefined {
  if (!slug) return undefined;
  const entry = Object.entries(EVENT_CATEGORIES).find(([, v]) => v.slug === slug);
  return entry?.[0] as EventCategory | undefined;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
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

/** Il confine di Suspense sta qui e non in un `loading.tsx`: vedi ADR-028. */
export default async function EventiPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;

  return (
    <Suspense
      key={`${sp.categoria ?? ""}-${sp.citta ?? ""}-${sp.brevi ?? ""}-${sp.page ?? "1"}`}
      fallback={<SkeletonEventi />}
    >
      <Elenco sp={sp} />
    </Suspense>
  );
}

async function Elenco({ sp }: { sp: Search }) {
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const cat = categoryFromSlug(sp.categoria);

  /*
   * Il filtro degli ingaggi brevi.
   *
   * `lte: ORE_BREVE` **e** `gt: 0`, non solo il primo: in SQL `NULL` non
   * soddisfa nessun confronto, quindi gli annunci senza durata restano fuori
   * da soli — ed è giusto, perché non hanno dichiarato di essere brevi. Il
   * `gt: 0` è la difesa contro uno zero entrato da uno script: durata zero
   * passerebbe `lte` e comparirebbe fra i brevi come «0 ore».
   *
   * La soglia non è scritta qui: sta in `lib/ingaggi.ts`, nello stesso posto da
   * cui la legge chi pubblica. Due copie della stessa soglia è la forma di
   * difetto numero due.
   */
  const soloBrevi = sp.brevi === "1";

  const where = {
    isPublic: true,
    status: "PUBLISHED",
    startsAt: { gte: new Date() },
    ...(cat ? { category: cat } : {}),
    ...(sp.citta ? { citySlug: sp.citta } : {}),
    ...(soloBrevi ? { durataOre: { gt: 0, lte: ORE_BREVE } } : {}),
  };

  // La settimana entrante è l'orizzonte utile: un artista che cerca lavoro
  // guarda prima cosa c'è adesso, non cosa ci sarà a novembre.
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [events, total, paid, thisWeek] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        slug: true,
        title: true,
        description: true,
        coverImage: true,
        category: true,
        startsAt: true,
        city: true,
        venueName: true,
        isPaid: true,
        feeMin: true,
        feeMax: true,
        durataOre: true,
      },
    }),
    prisma.event.count({ where }),
    prisma.event.count({ where: { ...where, isPaid: true } }),
    prisma.event.count({
      where: { ...where, startsAt: { gte: new Date(), lte: inSevenDays } },
    }),
  ]);

  const heading = cat ? EVENT_CATEGORIES[cat].plural : "Ingaggi aperti";
  const listName = cat
    ? `${EVENT_CATEGORIES[cat].plural} per artisti`
    : "Ingaggi aperti per artisti";
  const basePath = cat ? `/eventi?categoria=${EVENT_CATEGORIES[cat].slug}` : "/eventi";

  return (
    <>
      <PageHero
        breadcrumbs={[{ name: "Ingaggi", path: "/eventi" }]}
        eyebrow="Opportunità"
        title={heading}
        highlight="per artisti"
        lead={
          <>
            Concerti, casting, workshop e contest con compenso dichiarato in chiaro. Ci si candida
            direttamente all&apos;organizzatore, senza passaggi intermedi.
          </>
        }
        stats={[
          { label: "Ingaggi aperti", value: total },
          { label: "Con compenso", value: paid },
          { label: "Nei prossimi 7 giorni", value: thisWeek },
        ]}
        filters={
          <nav aria-label="Filtra per categoria" className="filters">
            <Link href="/eventi" className="filter" aria-current={!cat && !soloBrevi}>
              Tutti
            </Link>
            {/* ── Gli ingaggi brevi ──

                Prima delle categorie e non in fondo: è il taglio che decide se
                un annuncio è alla portata di chi ha un pomeriggio libero, e
                per la maggior parte degli artisti conta più del genere. Le
                categorie dicono *che tipo* di lavoro è; questo dice *se puoi
                farlo*.

                Il filtro si somma alla categoria invece di sostituirla —
                `brevi=1` resta nell'indirizzo — perché «laboratori, ma solo
                brevi» è una domanda sensata e le due cose non si escludono. */}
            <Link
              href={
                cat ? `/eventi?categoria=${EVENT_CATEGORIES[cat].slug}&brevi=1` : "/eventi?brevi=1"
              }
              className="filter"
              aria-current={soloBrevi}
            >
              Brevi (max {ORE_BREVE} h)
            </Link>
            {Object.entries(EVENT_CATEGORIES).map(([key, v]) => (
              <Link
                key={key}
                href={`/eventi?categoria=${v.slug}`}
                className="filter"
                aria-current={cat === key}
              >
                {v.plural}
              </Link>
            ))}
          </nav>
        }
      />

      <div className="container-page py-14">
        {events.length === 0 ? (
          <EmptyState
            title="Nessun ingaggio aperto"
            body="Al momento non ci sono opportunità con questi filtri. Riprova tra poco o allarga la ricerca."
            ctaLabel="Tutti gli ingaggi"
            ctaHref="/eventi"
          />
        ) : (
          <>
            <JsonLd
              data={itemListJsonLd(
                events.map((e) => ({ name: e.title, path: `/eventi/${e.slug}` })),
                listName
              )}
            />

            <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e, i) => (
                <EventCard key={e.slug} event={e} priority={i < 3} />
              ))}
            </div>

            <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath={basePath} />
          </>
        )}

        <section className="mt-20 border-t pt-14">
          <p className="eyebrow">Un altro modo di cercare</p>
          <h2 className="mt-2 text-fluid-xl">Gli ingaggi sulla mappa</h2>
          <p className="mt-3 max-w-2xl text-fluid-sm text-ink-muted">
            Per un musicista la distanza è un criterio di selezione quanto il compenso. La mappa
            mostra dove sono le opportunità prima di dire cosa sono.
          </p>
          <Link href="/mappa" className="btn-ghost mt-6 inline-flex">
            <MapIcon className="h-4 w-4" aria-hidden="true" />
            Apri la mappa
          </Link>
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { DISCIPLINES, disciplineBySlug } from "@/lib/constants";
import { ArtistCard } from "@/components/ArtistCard";
import { PageHero } from "@/components/PageHero";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonld";
import { fromCsv } from "@/lib/slug";

export const revalidate = 600;
const PER_PAGE = 24;

type Search = { page?: string; disciplina?: string; citta?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const d = sp.disciplina ? disciplineBySlug(sp.disciplina) : undefined;
  const page = Number(sp.page ?? 1);

  const title = d ? `${d.plural} in Italia` : "Artisti in Italia";
  const suffix = page > 1 ? ` — pagina ${page}` : "";

  return buildMetadata({
    title: `${title}${suffix}`,
    description: d
      ? `Elenco di ${d.plural.toLowerCase()} disponibili per ingaggi in Italia: portfolio, città, disponibilità. Contatta direttamente il profilo che ti interessa.`
      : "La directory degli artisti su Vybes: musicisti, DJ, band, ballerini, attori e performer disponibili per ingaggi in tutta Italia.",
    // Canonical sempre alla pagina 1 senza filtri: evita contenuti duplicati
    // generati dalle combinazioni di query string.
    path: d ? `/artisti?disciplina=${d.slug}` : "/artisti",
    // Le pagine oltre la prima restano crawlabili ma fuori dall'indice.
    noindex: page > 1,
  });
}

export default async function ArtistiPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const discipline = sp.disciplina ? disciplineBySlug(sp.disciplina) : undefined;

  const where = {
    isPublic: true,
    role: "ARTIST",
    ...(discipline ? { disciplines: { contains: discipline.slug } } : {}),
    ...(sp.citta ? { citySlug: sp.citta } : {}),
  };

  const [artists, total, verified, cities] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ reputation: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        slug: true, name: true, headline: true, image: true, city: true,
        disciplines: true, level: true, isVerified: true,
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, isVerified: true } }),
    // Quante città distinte sono rappresentate: è il numero che dice a un
    // organizzatore se la piattaforma copre la sua zona.
    prisma.user.groupBy({ by: ["citySlug"], where: { ...where, citySlug: { not: null } } }),
  ]);

  const heading = discipline ? discipline.plural : "Artisti";
  const listName = discipline ? `${discipline.plural} in Italia` : "Artisti in Italia";
  const basePath = discipline ? `/artisti?disciplina=${discipline.slug}` : "/artisti";

  return (
    <>
      <PageHero
        breadcrumbs={
          discipline
            ? [{ name: "Artisti", path: "/artisti" }, { name: discipline.plural, path: basePath }]
            : [{ name: "Artisti", path: "/artisti" }]
        }
        eyebrow="Directory"
        title={heading}
        highlight="in Italia"
        lead={
          <>
            Profili pubblici con portfolio, città e disponibilità. Si contattano
            direttamente: nessuna agenzia in mezzo, nessuna commissione. Se cerchi
            nella tua zona parti dalla{" "}
            <Link href="/citta" className="link-underline">
              directory per città
            </Link>
            .
          </>
        }
        stats={[
          { label: discipline ? discipline.plural : "Profili pubblici", value: total },
          { label: "Identità verificate", value: verified },
          { label: "Città rappresentate", value: cities.length },
        ]}
        filters={
          <nav aria-label="Filtra per disciplina" className="filters">
            <Link href="/artisti" className="filter" aria-current={!discipline}>
              Tutti
            </Link>
            {DISCIPLINES.map((d) => (
              <Link
                key={d.slug}
                href={`/artisti?disciplina=${d.slug}`}
                className="filter"
                aria-current={discipline?.slug === d.slug}
              >
                {d.plural}
              </Link>
            ))}
          </nav>
        }
      />

      <div className="container-page py-14">
        {artists.length === 0 ? (
          <EmptyState
            title="Nessun artista trovato"
            body="Prova a rimuovere i filtri o esplora le altre discipline."
            ctaLabel="Vedi tutti gli artisti"
            ctaHref="/artisti"
          />
        ) : (
          <>
            <JsonLd
              data={itemListJsonLd(
                artists.map((a) => ({ name: a.name, path: `/artisti/${a.slug}` })),
                listName
              )}
            />

            <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((a, i) => (
                <ArtistCard
                  key={a.slug}
                  // Solo le prime tre schede sono sopra la piega: caricare in
                  // priorità anche le altre ventuno ruberebbe banda all'LCP.
                  priority={i < 3}
                  artist={{ ...a, disciplines: fromCsv(a.disciplines) }}
                />
              ))}
            </div>

            <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath={basePath} />
          </>
        )}

        {/* Uscite laterali in fondo all'elenco: chi arriva da una ricerca
            generica e non trova il profilo giusto ha comunque dove andare,
            invece di tornare indietro. */}
        <section className="mt-20 border-t pt-14">
          <p className="eyebrow">Cerchi vicino a te?</p>
          <h2 className="mt-2 text-fluid-xl">Sfoglia per città</h2>
          <p className="mt-3 max-w-2xl text-fluid-sm text-ink-muted">
            Ogni città ha la sua pagina, con gli artisti attivi in zona e gli
            ingaggi aperti nei dintorni.
          </p>
          <Link href="/citta" className="btn-ghost mt-6 inline-flex">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Apri la directory locale
          </Link>
        </section>
      </div>
    </>
  );
}

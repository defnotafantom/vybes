import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { DISCIPLINES, disciplineBySlug } from "@/lib/constants";
import { ArtistCard } from "@/components/ArtistCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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

  const [artists, total] = await Promise.all([
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
  ]);

  const heading = discipline ? `${discipline.plural} in Italia` : "Artisti in Italia";
  const basePath = discipline ? `/artisti?disciplina=${discipline.slug}` : "/artisti";

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        items={
          discipline
            ? [{ name: "Artisti", path: "/artisti" }, { name: discipline.plural, path: basePath }]
            : [{ name: "Artisti", path: "/artisti" }]
        }
      />

      <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
      <p className="mt-3 max-w-2xl muted">
        {total} profili pubblici. Filtra per disciplina o consulta la{" "}
        <Link href="/citta" className="text-brand-600 hover:underline">directory per città</Link>.
      </p>

      <nav aria-label="Filtra per disciplina" className="mt-6 flex flex-wrap gap-2">
        <Link href="/artisti" className={discipline ? "btn-ghost" : "btn-primary"}>Tutti</Link>
        {DISCIPLINES.map((d) => (
          <Link
            key={d.slug}
            href={`/artisti?disciplina=${d.slug}`}
            className={discipline?.slug === d.slug ? "btn-primary" : "btn-ghost"}
          >
            {d.plural}
          </Link>
        ))}
      </nav>

      {artists.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nessun artista trovato"
            body="Prova a rimuovere i filtri o esplora le altre discipline."
            ctaLabel="Vedi tutti gli artisti"
            ctaHref="/artisti"
          />
        </div>
      ) : (
        <>
          <JsonLd
            data={itemListJsonLd(
              artists.map((a) => ({ name: a.name, path: `/artisti/${a.slug}` })),
              heading
            )}
          />
          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a, i) => (
              <ArtistCard key={a.slug} priority={i < 3} artist={{ ...a, disciplines: fromCsv(a.disciplines) }} />
            ))}
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath={basePath} />
        </>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArtistCard } from "@/components/ArtistCard";
import { EmptyState } from "@/components/EmptyState";
import { DISCIPLINES, disciplineBySlug, MIN_ITEMS_FOR_INDEX } from "@/lib/constants";
import { fromCsv } from "@/lib/slug";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonld";
import { ARTISTA_PUBBLICO } from "@/lib/visibilita";

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Long tail: "DJ a Milano", "Cantanti a Roma"...
 * Si pre-generano solo le combinazioni con almeno un profilo, per non
 * creare centinaia di pagine vuote (thin content).
 */
export async function generateStaticParams() {
  const cities = await prisma.city.findMany({ select: { slug: true } });
  const populated = await prisma.user.groupBy({
    by: ["citySlug"],
    where: { ...ARTISTA_PUBBLICO, citySlug: { not: null } },
    _count: { _all: true },
  });
  const withArtists = new Set(populated.map((p) => p.citySlug));

  return cities
    .filter((c) => withArtists.has(c.slug))
    .flatMap((c) => DISCIPLINES.map((d) => ({ citta: c.slug, disciplina: d.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ citta: string; disciplina: string }>;
}): Promise<Metadata> {
  const { citta, disciplina } = await params;
  const [city, d] = [await prisma.city.findUnique({ where: { slug: citta } }), disciplineBySlug(disciplina)];
  if (!city || !d) {
    return buildMetadata({ title: "Pagina non trovata", path: `/citta/${citta}/artisti/${disciplina}`, noindex: true });
  }

  // Una pagina senza profili resta raggiungibile ma non va nell'indice:
  // sarebbe thin content, e i link interni verso di essa restano utili.
  const count = await prisma.user.count({
    where: {
      ...ARTISTA_PUBBLICO,
      citySlug: city.slug,
      disciplines: { contains: d.slug },
    },
  });

  return buildMetadata({
    title: `${d.plural} a ${city.name}`,
    description: `${d.plural} disponibili a ${city.name}: profili con portfolio, disponibilità e contatto diretto. Ingaggia in ${city.region} senza commissioni.`,
    path: `/citta/${city.slug}/artisti/${d.slug}`,
    keywords: [
      `${d.plural.toLowerCase()} ${city.name}`,
      `ingaggiare ${d.plural.toLowerCase()} ${city.name}`,
      `${d.label.toLowerCase()} ${city.name}`,
    ],
    noindex: count < MIN_ITEMS_FOR_INDEX,
  });
}

export default async function CityDisciplinePage({
  params,
}: {
  params: Promise<{ citta: string; disciplina: string }>;
}) {
  const { citta, disciplina } = await params;
  const city = await prisma.city.findUnique({ where: { slug: citta } });
  const d = disciplineBySlug(disciplina);
  if (!city || !d) notFound();

  const artists = await prisma.user.findMany({
    where: {
      ...ARTISTA_PUBBLICO,
      citySlug: city.slug,
      disciplines: { contains: d.slug },
    },
    orderBy: [{ reputation: "desc" }, { updatedAt: "desc" }],
    take: 48,
    select: {
      slug: true, name: true, headline: true, image: true, city: true,
      disciplines: true, reputation: true, isVerified: true,
    },
  });

  const others = DISCIPLINES.filter((x) => x.slug !== d.slug);

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        items={[
          { name: "Città", path: "/citta" },
          { name: city.name, path: `/citta/${city.slug}` },
          { name: "Artisti", path: `/citta/${city.slug}/artisti` },
          { name: d.plural, path: `/citta/${city.slug}/artisti/${d.slug}` },
        ]}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">
        {d.plural} a {city.name}
      </h1>
      <p className="mt-4 max-w-3xl leading-relaxed muted">
        {artists.length > 0
          ? `${artists.length} ${d.plural.toLowerCase()} con profilo pubblico a ${city.name} e dintorni. `
          : `Stiamo costruendo l'elenco dei ${d.plural.toLowerCase()} di ${city.name}. `}
        Ogni profilo mostra portfolio, discipline e contatto diretto: la trattativa avviene tra te e
        l&apos;artista, Vybes non trattiene commissioni sul cachet.
      </p>

      {artists.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={`Nessun profilo in questa categoria`}
            body={`Non ci sono ancora ${d.plural.toLowerCase()} registrati a ${city.name}. Guarda le altre discipline o allarga la ricerca a tutta Italia.`}
            ctaLabel={`Tutti i ${d.plural.toLowerCase()} in Italia`}
            ctaHref={`/artisti?disciplina=${d.slug}`}
          />
        </div>
      ) : (
        <>
          <JsonLd
            data={itemListJsonLd(
              artists.map((a) => ({ name: a.name, path: `/artisti/${a.slug}` })),
              `${d.plural} a ${city.name}`
            )}
          />
          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a, i) => (
              <ArtistCard key={a.slug} priority={i < 3} artist={{ ...a, disciplines: fromCsv(a.disciplines) }} />
            ))}
          </div>
        </>
      )}

      <section className="mt-14">
        <h2 className="text-xl font-bold">Altre discipline a {city.name}</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/citta/${city.slug}/artisti/${o.slug}`} className="btn-ghost">
                {o.plural}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

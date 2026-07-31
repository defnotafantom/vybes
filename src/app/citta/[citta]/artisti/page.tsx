import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArtistCard } from "@/components/ArtistCard";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { DISCIPLINES } from "@/lib/constants";
import { fromCsv } from "@/lib/slug";
import { JsonLd } from "@/components/JsonLd";
import { itemListJsonLd } from "@/lib/jsonld";

export const revalidate = 3600;
const PER_PAGE = 24;

export async function generateStaticParams() {
  const cities = await prisma.city.findMany({ select: { slug: true } });
  return cities.map((c) => ({ citta: c.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ citta: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const [{ citta }, sp] = await Promise.all([params, searchParams]);
  const city = await prisma.city.findUnique({ where: { slug: citta } });
  if (!city) return buildMetadata({ title: "Città non trovata", path: `/citta/${citta}/artisti`, noindex: true });
  const page = Number(sp.page ?? 1);

  return buildMetadata({
    title: `Artisti a ${city.name}${page > 1 ? ` — pagina ${page}` : ""}`,
    description: `Elenco degli artisti disponibili a ${city.name}: musicisti, DJ, band, ballerini e performer con portfolio pubblico. Contatta chi ti serve senza intermediari.`,
    path: `/citta/${city.slug}/artisti`,
    keywords: [`artisti ${city.name}`, `musicisti ${city.name}`, `band ${city.name}`, `dj ${city.name}`],
    noindex: page > 1,
  });
}

export default async function CityArtistsPage({
  params,
  searchParams,
}: {
  params: Promise<{ citta: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ citta }, sp] = await Promise.all([params, searchParams]);
  const city = await prisma.city.findUnique({ where: { slug: citta } });
  if (!city) notFound();

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const where = { isPublic: true, citySlug: city.slug, role: "ARTIST" };

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

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        items={[
          { name: "Città", path: "/citta" },
          { name: city.name, path: `/citta/${city.slug}` },
          { name: "Artisti", path: `/citta/${city.slug}/artisti` },
        ]}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">Artisti a {city.name}</h1>
      <p className="mt-3 max-w-2xl muted">
        {total} profili attivi a {city.name} e provincia. Vedi anche gli{" "}
        <Link href={`/citta/${city.slug}/eventi`} className="text-brand-600 hover:underline">
          ingaggi aperti in città
        </Link>.
      </p>

      <nav aria-label="Filtra per disciplina" className="mt-6 flex flex-wrap gap-2">
        {DISCIPLINES.map((d) => (
          <Link key={d.slug} href={`/citta/${city.slug}/artisti/${d.slug}`} className="btn-ghost">
            {d.plural}
          </Link>
        ))}
      </nav>

      {artists.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={`Ancora nessun artista a ${city.name}`}
            body="Sei tu il primo? Crea il profilo e comparirai in questa pagina."
            ctaLabel="Crea il tuo profilo"
            ctaHref="/registrati?ruolo=artista"
          />
        </div>
      ) : (
        <>
          <JsonLd
            data={itemListJsonLd(
              artists.map((a) => ({ name: a.name, path: `/artisti/${a.slug}` })),
              `Artisti a ${city.name}`
            )}
          />
          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a, i) => (
              <ArtistCard key={a.slug} priority={i < 3} artist={{ ...a, disciplines: fromCsv(a.disciplines) }} />
            ))}
          </div>
          <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath={`/citta/${city.slug}/artisti`} />
        </>
      )}
    </div>
  );
}

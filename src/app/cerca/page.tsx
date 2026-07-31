import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchForm } from "@/components/SearchForm";
import { fromCsv } from "@/lib/slug";

// La pagina risultati non va indicizzata: contenuto duplicato e infinito.
export const metadata: Metadata = buildMetadata({
  title: "Cerca artisti, ingaggi e portfolio",
  description: "Cerca su Vybes tra artisti, ingaggi aperti, portfolio e post della community.",
  path: "/cerca",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const results =
    term.length >= 2
      ? await Promise.all([
          prisma.user.findMany({
            where: {
              isPublic: true,
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { headline: { contains: term, mode: "insensitive" } },
                { disciplines: { contains: term.toLowerCase() } },
              ],
            },
            take: 12,
            select: { slug: true, name: true, headline: true, city: true, disciplines: true },
          }),
          prisma.event.findMany({
            where: {
              isPublic: true,
              status: "PUBLISHED",
              OR: [
                { title: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
                { city: { contains: term, mode: "insensitive" } },
              ],
            },
            orderBy: { startsAt: "asc" },
            take: 12,
            select: { slug: true, title: true, city: true, startsAt: true },
          }),
          prisma.portfolioItem.findMany({
            where: {
              isPublic: true,
              OR: [
                { title: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
              ],
            },
            take: 8,
            select: { slug: true, title: true, user: { select: { name: true } } },
          }),
        ])
      : null;

  const [artists, events, portfolio] = results ?? [[], [], []];
  const totalResults = artists.length + events.length + portfolio.length;

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Cerca", path: "/cerca" }]} />
      <h1 className="text-3xl font-bold">Cerca su Vybes</h1>

      <div className="mt-6 max-w-xl">
        <SearchForm initialQuery={term} />
      </div>

      {term.length >= 2 && (
        <p className="mt-6 text-sm muted">
          {totalResults} risultati per <strong>{term}</strong>
        </p>
      )}

      {artists.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Artisti</h2>
          <ul className="mt-4 space-y-2">
            {artists.map((a) => (
              <li key={a.slug} className="card p-4">
                <Link href={`/artisti/${a.slug}`} className="font-medium hover:text-brand-600">{a.name}</Link>
                <p className="text-sm muted">
                  {[a.headline, a.city, fromCsv(a.disciplines).join(", ")].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Ingaggi</h2>
          <ul className="mt-4 space-y-2">
            {events.map((e) => (
              <li key={e.slug} className="card p-4">
                <Link href={`/eventi/${e.slug}`} className="font-medium hover:text-brand-600">{e.title}</Link>
                <p className="text-sm muted">{e.city} · {e.startsAt.toLocaleDateString("it-IT")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {portfolio.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Portfolio</h2>
          <ul className="mt-4 space-y-2">
            {portfolio.map((p) => (
              <li key={p.slug} className="card p-4">
                <Link href={`/portfolio/${p.slug}`} className="font-medium hover:text-brand-600">{p.title}</Link>
                <p className="text-sm muted">di {p.user.name}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {term.length >= 2 && totalResults === 0 && (
        <p className="mt-10 muted">
          Nessun risultato. Prova con un altro termine o esplora la{" "}
          <Link href="/citta" className="text-brand-600 hover:underline">directory per città</Link>.
        </p>
      )}
    </div>
  );
}

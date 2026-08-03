import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchForm } from "@/components/SearchForm";
import { fromCsv } from "@/lib/slug";
import { PROFILO_PUBBLICO } from "@/lib/visibilita";
import { dataBreve } from "@/lib/date";
import { ArtistCard } from "@/components/ArtistCard";
import { conta } from "@/lib/testo";

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
              ...PROFILO_PUBBLICO,
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { headline: { contains: term, mode: "insensitive" } },
                { disciplines: { contains: term.toLowerCase() } },
              ],
            },
            take: 12,
            select: { slug: true, name: true, headline: true, image: true, city: true, disciplines: true, reputation: true, isVerified: true },
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
      <h1 className="text-fluid-2xl">Cerca su Vybes</h1>

      <div className="mt-6 max-w-xl">
        <SearchForm initialQuery={term} />
      </div>

      {term.length >= 2 && (
        <p className="mt-6 text-fluid-sm text-ink-muted">
          {conta(totalResults, "risultato", "risultati")} per{" "}
          <strong className="text-ink">{term}</strong>
        </p>
      )}

      {/* ── Perché qui si usano le stesse schede degli elenchi ──
          I risultati erano strisce di testo a tutta larghezza: nome in
          grassetto e una riga di dettagli separati da puntini. Funzionava, ma
          era l'unica pagina del sito a non somigliare alle altre — e la
          ricerca è raggiunta dalla barra principale, quindi molti la vedono
          prima della directory.

          Chi arriva qui ha già in mente cosa cerca: riconoscere un artista
          nella stessa forma in cui lo vedrà ovunque costa meno che imparare
          un secondo modo di leggere gli stessi dati. */}
      {artists.length > 0 && (
        <section className="mt-10">
          <h2 className="text-fluid-lg font-bold">Artisti</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <ArtistCard key={a.slug} artist={{ ...a, disciplines: fromCsv(a.disciplines) }} />
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-10">
          <h2 className="text-fluid-lg font-bold">Ingaggi</h2>
          <ul className="mt-4 space-y-2">
            {events.map((e) => (
              <li key={e.slug}>
                <Link href={`/eventi/${e.slug}`} className="card-interactive block">
                  <span className="block text-fluid-sm font-semibold">{e.title}</span>
                  <span className="mt-1 block text-fluid-xs text-ink-muted">
                    {e.city} · {dataBreve(e.startsAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {portfolio.length > 0 && (
        <section className="mt-10">
          <h2 className="text-fluid-lg font-bold">Portfolio</h2>
          <ul className="mt-4 space-y-2">
            {portfolio.map((p) => (
              <li key={p.slug}>
                <Link href={`/portfolio/${p.slug}`} className="card-interactive block">
                  <span className="block text-fluid-sm font-semibold">{p.title}</span>
                  <span className="mt-1 block text-fluid-xs text-ink-muted">di {p.user.name}</span>
                </Link>
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

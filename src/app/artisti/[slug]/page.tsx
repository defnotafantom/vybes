import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { artistJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventCard } from "@/components/EventCard";
import { fromCsv } from "@/lib/slug";
import { disciplineBySlug } from "@/lib/constants";
import { levelProgress } from "@/lib/levels";
import { FollowButton } from "@/components/FollowButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";

export const revalidate = 3600;
export const dynamicParams = true; // i profili nuovi vengono generati on-demand

/** Pre-genera i profili più consultati; il resto arriva via ISR. */
export async function generateStaticParams() {
  const top = await prisma.user.findMany({
    where: { isPublic: true },
    orderBy: { reputation: "desc" },
    take: 200,
    select: { slug: true },
  });
  return top.map((u) => ({ slug: u.slug }));
}

async function getArtist(slug: string) {
  return prisma.user.findFirst({
    where: { slug, isPublic: true },
    select: {
      id: true, slug: true, name: true, headline: true, bio: true, image: true, cover: true,
      city: true, citySlug: true, region: true, disciplines: true, website: true,
      instagram: true, spotify: true, youtube: true, level: true, experience: true,
      reputation: true, isVerified: true, role: true, createdAt: true, updatedAt: true,
      portfolioItems: {
        where: { isPublic: true },
        orderBy: { position: "asc" },
        take: 12,
        select: { slug: true, title: true, mediaUrl: true, mediaType: true, year: true },
      },
      eventsCreated: {
        where: { isPublic: true, status: "PUBLISHED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: {
          slug: true, title: true, description: true, coverImage: true, category: true,
          startsAt: true, city: true, venueName: true, isPaid: true, feeMin: true, feeMax: true,
        },
      },
      _count: { select: { followers: true, posts: true, participations: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) return buildMetadata({ title: "Profilo non trovato", path: `/artisti/${slug}`, noindex: true });

  const disciplines = fromCsv(artist.disciplines)
    .map((d) => disciplineBySlug(d)?.label ?? d)
    .join(", ");
  const place = artist.city ? ` a ${artist.city}` : " in Italia";

  return buildMetadata({
    title: `${artist.name} — ${disciplines || "Artista"}${place}`,
    description:
      artist.headline ||
      artist.bio ||
      `${artist.name}: profilo, portfolio e disponibilità per ingaggi${place}. Contatta direttamente l'artista su Vybes.`,
    path: `/artisti/${artist.slug}`,
    type: "profile",
    modifiedTime: artist.updatedAt,
    images: [{ url: absoluteUrl(`/artisti/${artist.slug}/opengraph-image`), alt: artist.name }],
  });
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) notFound();

  const disciplines = fromCsv(artist.disciplines);
  const sameAs = [artist.website, artist.instagram, artist.spotify, artist.youtube].filter(
    (v): v is string => Boolean(v)
  );
  const progress = levelProgress(artist.experience);

  return (
    <>
      <JsonLd
        data={artistJsonLd({
          name: artist.name,
          slug: artist.slug,
          headline: artist.headline,
          bio: artist.bio,
          image: artist.image,
          city: artist.city,
          region: artist.region,
          disciplines: disciplines.map((d) => disciplineBySlug(d)?.label ?? d),
          sameAs,
          isBand: disciplines.includes("band"),
        })}
      />

      {/* ─────────────────────────── INTESTAZIONE ─────────────────────────── */}
      <header className="relative isolate overflow-hidden border-b">
        <div className="mesh-hero opacity-50" aria-hidden="true" />

        <div className="container-page pb-12 pt-8">
          <Breadcrumbs
            items={[
              { name: "Artisti", path: "/artisti" },
              ...(artist.citySlug && artist.city
                ? [{ name: artist.city, path: `/citta/${artist.citySlug}/artisti` }]
                : []),
              { name: artist.name, path: `/artisti/${artist.slug}` },
            ]}
          />

          <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
            <Avatar name={artist.name} src={artist.image} size="xl" rounded="xl" priority />

            <div className="min-w-0 flex-1">
              {disciplines.length > 0 && (
                <p className="eyebrow">
                  {disciplines.map((d) => disciplineBySlug(d)?.label ?? d).join(" · ")}
                </p>
              )}

              <h1 className="mt-3 flex flex-wrap items-center gap-3 text-fluid-3xl">
                {artist.name}
                {artist.isVerified && (
                  <Badge tone="brand" className="text-fluid-xs">
                    <VerifiedBadge />
                    Verificato
                  </Badge>
                )}
              </h1>

              {artist.headline && (
                <p className="mt-4 max-w-2xl text-fluid-base leading-relaxed text-ink-muted">
                  {artist.headline}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {disciplines.map((d) => (
                  <Link key={d} href={`/artisti?disciplina=${d}`} className="chip">
                    {disciplineBySlug(d)?.label ?? d}
                  </Link>
                ))}
                {artist.city && artist.citySlug && (
                  <Link href={`/citta/${artist.citySlug}`} className="chip-accent">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {artist.city}
                  </Link>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/dashboard/messaggi/nuovo?a=${artist.slug}`} className="btn-primary">
                  Contatta {artist.name.split(" ")[0]}
                </Link>
                <FollowButton slug={artist.slug} initialCount={artist._count.followers} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────── NUMERI ─────────────────────────── */}
      <section className="border-b bg-surface-sunken">
        <dl className="container-page grid grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Livello", value: progress.level },
            { label: "Reputazione", value: artist.reputation },
            { label: "Follower", value: artist._count.followers },
            { label: "Ingaggi", value: artist._count.participations },
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

      <div className="container-page py-16">
        <div className="grid gap-14 lg:grid-cols-[1fr_300px]">
          <article className="min-w-0 space-y-14">
            {artist.bio && (
              <section>
                <p className="eyebrow">Il profilo</p>
                <h2 className="mt-2 text-fluid-xl">Chi è {artist.name}</h2>
                <div className="prose-vybes mt-6 max-w-2xl whitespace-pre-line text-ink-muted">
                  {artist.bio}
                </div>
              </section>
            )}

            {artist.portfolioItems.length > 0 && (
              <section>
                <p className="eyebrow">Lavori</p>
                <h2 className="mt-2 text-fluid-xl">Portfolio</h2>

                {/* Due colonne e non tre: il portfolio è la ragione per cui
                    qualcuno apre questa pagina, e le immagini grandi lo
                    dicono meglio di qualunque titolo. */}
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {artist.portfolioItems.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/portfolio/${item.slug}`}
                        className="card-interactive group block overflow-hidden p-0"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
                          {item.mediaType === "image" && (
                            <Image
                              src={item.mediaUrl}
                              alt={item.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 40vw"
                              className="object-cover transition-transform duration-600 ease-out group-hover:scale-105"
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-fluid-sm font-semibold transition-colors group-hover:text-brand-400">
                            {item.title}
                          </h3>
                          {item.year && (
                            <p className="mt-0.5 text-fluid-xs text-ink-faint">{item.year}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {artist.eventsCreated.length > 0 && (
              <section>
                <p className="eyebrow">Organizza</p>
                <h2 className="mt-2 text-fluid-xl">Ingaggi pubblicati da {artist.name}</h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {artist.eventsCreated.map((e) => (
                    <EventCard key={e.slug} event={e} />
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* ─────────────────────────── COLONNA ─────────────────────────── */}
          <aside className="space-y-6">
            <div className="card">
              <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Livello</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-fluid-2xl font-bold tabular-nums">{progress.level}</span>
                <span className="text-fluid-sm text-ink-faint">
                  {artist.experience} punti esperienza
                </span>
              </p>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                role="progressbar"
                aria-valuenow={Math.round(progress.percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso verso il livello ${progress.level + 1}`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400"
                  style={{ width: `${Math.min(100, progress.percent)}%` }}
                />
              </div>
            </div>

            {sameAs.length > 0 && (
              <div className="card">
                <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Altrove</p>
                <ul className="mt-3 space-y-2">
                  {sameAs.map((url) => (
                    <li key={url}>
                      {/* nofollow: sono link dichiarati dall'utente, non
                          raccomandazioni editoriali. Senza, il profilo
                          diventerebbe un bersaglio per lo spam di link. */}
                      <a
                        href={url}
                        rel="me noopener nofollow"
                        target="_blank"
                        className="link-underline inline-flex items-center gap-1.5 text-fluid-sm"
                      >
                        {new URL(url).hostname.replace("www.", "")}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

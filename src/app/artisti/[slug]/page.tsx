import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <div className="container-page py-10">
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

      <Breadcrumbs
        items={[
          { name: "Artisti", path: "/artisti" },
          ...(artist.citySlug && artist.city
            ? [{ name: artist.city, path: `/citta/${artist.citySlug}/artisti` }]
            : []),
          { name: artist.name, path: `/artisti/${artist.slug}` },
        ]}
      />

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
<Avatar name={artist.name} src={artist.image} size="xl" rounded="xl" priority />

        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold sm:text-4xl">
            {artist.name}
            {artist.isVerified && (
              <Badge tone="brand" className="text-xs">
                <VerifiedBadge />
                Verificato
              </Badge>
            )}
          </h1>
          {artist.headline && <p className="mt-2 text-lg muted">{artist.headline}</p>}

          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {disciplines.map((d) => {
              const meta = disciplineBySlug(d);
              return (
                <Link
                  key={d}
                  href={`/artisti?disciplina=${d}`}
                  className="rounded bg-brand-50 px-2 py-1 text-brand-700 hover:bg-brand-100 dark:bg-white/5 dark:text-brand-300"
                >
                  {meta?.label ?? d}
                </Link>
              );
            })}
            {artist.city && artist.citySlug && (
              <Link href={`/citta/${artist.citySlug}`} className="muted hover:text-brand-600">
                {artist.city}
              </Link>
            )}
          </p>

          <dl className="mt-5 flex flex-wrap gap-8 text-sm">
            <div><dt className="muted">Livello</dt><dd className="text-xl font-bold">{progress.level}</dd></div>
            <div><dt className="muted">Reputazione</dt><dd className="text-xl font-bold">{artist.reputation}</dd></div>
            <div><dt className="muted">Follower</dt><dd className="text-xl font-bold">{artist._count.followers}</dd></div>
            <div><dt className="muted">Ingaggi</dt><dd className="text-xl font-bold">{artist._count.participations}</dd></div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/dashboard/messaggi/nuovo?a=${artist.slug}`} className="btn-primary">
              Contatta
            </Link>
            <FollowButton slug={artist.slug} initialCount={artist._count.followers} />
            {sameAs.map((url) => (
              <a
                key={url}
                href={url}
                className="btn-ghost"
                rel="me noopener nofollow"
                target="_blank"
              >
                {new URL(url).hostname.replace("www.", "")}
              </a>
            ))}
          </div>
        </div>
      </header>

      {artist.bio && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold">Chi è {artist.name}</h2>
          <div className="prose-vybes mt-4 whitespace-pre-line muted">{artist.bio}</div>
        </section>
      )}

      {artist.portfolioItems.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Portfolio</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artist.portfolioItems.map((item) => (
              <li key={item.slug}>
                <Link href={`/portfolio/${item.slug}`} className="card block overflow-hidden p-0 hover:border-brand-400">
                  <div className="relative aspect-video bg-brand-50 dark:bg-white/5">
                    {item.mediaType === "image" && (
                      <Image
                        src={item.mediaUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium">{item.title}</h3>
                    {item.year && <p className="text-sm muted">{item.year}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {artist.eventsCreated.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Ingaggi pubblicati da {artist.name}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artist.eventsCreated.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

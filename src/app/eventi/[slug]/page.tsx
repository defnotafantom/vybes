import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { eventJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/constants";
import { ParticipateButton } from "@/components/ParticipateButton";
import { StaticMap } from "@/components/StaticMap";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Avatar } from "@/components/ui/Avatar";
import { Segnala } from "@/components/Segnala";

export const revalidate = 900;

export async function generateStaticParams() {
  const events = await prisma.event.findMany({
    where: { isPublic: true, status: "PUBLISHED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 200,
    select: { slug: true },
  });
  return events.map((e) => ({ slug: e.slug }));
}

async function getEvent(slug: string) {
  return prisma.event.findFirst({
    where: { slug, isPublic: true },
    include: {
      organizer: { select: { id: true, slug: true, name: true, image: true, isVerified: true } },
      _count: { select: { participations: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event)
    return buildMetadata({ title: "Ingaggio non trovato", path: `/eventi/${slug}`, noindex: true });

  const cat = EVENT_CATEGORIES[event.category as EventCategory]?.label ?? "Evento";
  const date = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(event.startsAt);

  return buildMetadata({
    title: `${event.title} — ${cat} a ${event.city}, ${date}`,
    description: event.description,
    path: `/eventi/${event.slug}`,
    type: "article",
    publishedTime: event.createdAt,
    modifiedTime: event.updatedAt,
    images: [{ url: absoluteUrl(`/eventi/${event.slug}/opengraph-image`), alt: event.title }],
    // Un evento annullato non deve continuare a comparire nella SERP.
    noindex: event.status === "CANCELLED" || event.status === "DRAFT",
  });
}

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const session = await auth();
  const cat = EVENT_CATEGORIES[event.category as EventCategory] ?? EVENT_CATEGORIES.LIVE;

  const myParticipation = session?.user?.id
    ? await prisma.participation.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
        select: { status: true },
      })
    : null;

  const accepted = await prisma.participation.findMany({
    where: { eventId: event.id, status: "ACCEPTED" },
    take: 12,
    select: {
      user: { select: { slug: true, name: true, image: true, headline: true } },
    },
  });

  const isPast = event.startsAt.getTime() < Date.now();
  const isOwner = session?.user?.id === event.organizerId;

  const fee = event.isPaid
    ? `${event.feeMin ?? 0}${
        event.feeMax && event.feeMax !== event.feeMin ? `–${event.feeMax}` : ""
      } ${event.currency}`
    : "Non retribuito";

  return (
    <>
      <JsonLd
        data={eventJsonLd({
          title: event.title,
          slug: event.slug,
          description: event.description,
          coverImage: event.coverImage,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          status: event.status,
          venueName: event.venueName,
          address: event.address,
          city: event.city,
          region: event.region,
          latitude: event.latitude,
          longitude: event.longitude,
          isPaid: event.isPaid,
          feeMin: event.feeMin,
          feeMax: event.feeMax,
          currency: event.currency,
          organizerName: event.organizer.name,
          organizerSlug: event.organizer.slug,
          capacity: event.capacity,
        })}
      />

      {/* ─────────────────────────── INTESTAZIONE ─────────────────────────── */}
      <header className="relative isolate overflow-hidden border-b">
        <div className="mesh-hero opacity-50" aria-hidden="true" />

        <div className="container-page pb-12 pt-8">
          <Breadcrumbs
            items={[
              { name: "Ingaggi", path: "/eventi" },
              { name: event.city, path: `/citta/${event.citySlug}/eventi` },
              { name: event.title, path: `/eventi/${event.slug}` },
            ]}
          />

          {event.status === "CANCELLED" && (
            <p
              role="alert"
              className="mb-8 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-fluid-sm text-red-400"
            >
              Questo ingaggio è stato annullato dall&apos;organizzatore.
            </p>
          )}

          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-end">
            <div className="min-w-0">
              <p className="eyebrow">{cat.label}</p>
              <h1 className="mt-3 max-w-3xl text-fluid-3xl">{event.title}</h1>

              {/* I tre dati che un artista cerca per primi, sulla stessa riga
                  e con il compenso in oro: si leggono senza doverli trovare. */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-fluid-sm">
                <span className="inline-flex items-center gap-2 text-ink-muted">
                  <CalendarDays className="h-4 w-4 text-brand-400" aria-hidden="true" />
                  <time dateTime={event.startsAt.toISOString()}>
                    {dateFmt.format(event.startsAt)}
                  </time>
                </span>

                <span className="inline-flex items-center gap-2 text-ink-muted">
                  <MapPin className="h-4 w-4 text-brand-400" aria-hidden="true" />
                  {event.venueName ? `${event.venueName}, ` : ""}
                  <Link
                    href={`/citta/${event.citySlug}`}
                    className="link-underline text-ink-muted"
                  >
                    {event.city}
                  </Link>
                </span>

                <span className={event.isPaid ? "chip-gold" : "chip"}>
                  <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                  {fee}
                </span>
              </div>
            </div>

            <div className="lg:justify-self-end">
              {isOwner ? (
                <Link href={`/dashboard/eventi/${event.id}`} className="btn-ghost w-full">
                  Gestisci candidature
                </Link>
              ) : (
                <ParticipateButton
                  eventId={event.id}
                  disabled={isPast || event.status !== "PUBLISHED"}
                  initialStatus={myParticipation?.status ?? null}
                  isAuthenticated={Boolean(session?.user?.id)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container-page py-16">
        <div className="grid gap-14 lg:grid-cols-[1fr_320px]">
          <article className="min-w-0 space-y-14">
            {event.coverImage && (
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border bg-surface-sunken">
                <OptimizedImage
                  src={event.coverImage}
                  alt={`Copertina di ${event.title}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                  className="object-cover"
                />
              </div>
            )}

            <section>
              <p className="eyebrow">L&apos;ingaggio</p>
              <h2 className="mt-2 text-fluid-xl">Cosa cercano</h2>
              <div className="prose-vybes mt-6 max-w-2xl whitespace-pre-line text-ink-muted">
                {event.description}
              </div>
            </section>

            {accepted.length > 0 && (
              <section>
                <p className="eyebrow">Cast</p>
                <h2 className="mt-2 text-fluid-xl">Artisti confermati</h2>

                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {accepted.map(({ user }) => (
                    <li key={user.slug}>
                      <Link
                        href={`/artisti/${user.slug}`}
                        className="card-interactive group flex items-center gap-3 py-3"
                      >
                        <Avatar name={user.name} src={user.image} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-fluid-sm font-semibold transition-colors group-hover:text-brand-400">
                            {user.name}
                          </span>
                          {user.headline && (
                            <span className="block truncate text-fluid-xs text-ink-faint">
                              {user.headline}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          {/* ─────────────────────────── COLONNA ─────────────────────────── */}
          <aside className="space-y-6">
            <div className="card">
              <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Organizzatore</p>
              <Link
                href={`/artisti/${event.organizer.slug}`}
                className="group mt-3 flex items-center gap-3"
              >
                <Avatar name={event.organizer.name} src={event.organizer.image} size="sm" />
                <span className="text-fluid-sm font-semibold transition-colors group-hover:text-brand-400">
                  {event.organizer.name}
                </span>
              </Link>
            </div>

            {event.capacity && (
              <div className="card">
                <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Candidature</p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="text-fluid-2xl font-bold tabular-nums">
                    {event._count.participations}
                  </span>
                  <span className="text-fluid-sm text-ink-faint">su {event.capacity} posti</span>
                </p>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                  role="progressbar"
                  aria-valuenow={event._count.participations}
                  aria-valuemin={0}
                  aria-valuemax={event.capacity}
                  aria-label="Posti occupati"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400"
                    style={{
                      width: `${Math.min(100, (event._count.participations / event.capacity) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {event.address && (
              <div className="card">
                <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Indirizzo</p>
                <p className="mt-2 text-fluid-sm text-ink-muted">
                  {event.venueName && (
                    <>
                      <span className="font-medium text-ink">{event.venueName}</span>
                      <br />
                    </>
                  )}
                  {event.address}
                  <br />
                  {event.city}
                </p>
              </div>
            )}

            <StaticMap
              latitude={event.latitude}
              longitude={event.longitude}
              label={event.venueName ?? event.city}
            />

            <div className="pt-2">
              <Segnala targetType="EVENT" targetId={event.slug} etichetta="Segnala questo ingaggio" />
            </div>

            {isPast && (
              <p className="flex items-center gap-2 text-fluid-xs text-ink-faint">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Questo ingaggio è già passato.
              </p>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

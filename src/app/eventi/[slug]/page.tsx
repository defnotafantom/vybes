import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { eventJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/constants";
import { ParticipateButton } from "@/components/ParticipateButton";
import { StaticMap } from "@/components/StaticMap";

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
  if (!event) return buildMetadata({ title: "Ingaggio non trovato", path: `/eventi/${slug}`, noindex: true });

  const cat = EVENT_CATEGORIES[event.category as EventCategory]?.label ?? "Evento";
  const date = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(event.startsAt);

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
  weekday: "long", day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit",
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

  return (
    <div className="container-page py-10">
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

      <Breadcrumbs
        items={[
          { name: "Ingaggi", path: "/eventi" },
          { name: event.city, path: `/citta/${event.citySlug}/eventi` },
          { name: event.title, path: `/eventi/${event.slug}` },
        ]}
      />

      {event.status === "CANCELLED" && (
        <p role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          Questo ingaggio è stato annullato dall&apos;organizzatore.
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <article>
          {event.coverImage && (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-xl bg-brand-100">
              <Image
                src={event.coverImage}
                alt={`Copertina di ${event.title}`}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
                className="object-cover"
              />
            </div>
          )}

          <p className="text-sm font-medium text-brand-600">{cat.label}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{event.title}</h1>

          <p className="mt-4 muted">
            <time dateTime={event.startsAt.toISOString()}>{dateFmt.format(event.startsAt)}</time>
            {event.endsAt && (
              <>
                {" – "}
                <time dateTime={event.endsAt.toISOString()}>{dateFmt.format(event.endsAt)}</time>
              </>
            )}
          </p>

          <section className="prose-vybes mt-8 whitespace-pre-line">
            <h2 className="sr-only">Descrizione dell&apos;ingaggio</h2>
            {event.description}
          </section>

          {accepted.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">Artisti confermati</h2>
              <ul className="mt-4 flex flex-wrap gap-4">
                {accepted.map(({ user }) => (
                  <li key={user.slug}>
                    <Link href={`/artisti/${user.slug}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:border-brand-400" style={{ borderColor: "rgb(var(--border))" }}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                        {user.name.charAt(0)}
                      </span>
                      <span className="text-sm font-medium">{user.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold">Dettagli</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="muted">Compenso</dt>
                <dd className="font-medium">
                  {event.isPaid
                    ? `${event.feeMin ?? 0}${event.feeMax && event.feeMax !== event.feeMin ? `–${event.feeMax}` : ""} ${event.currency}`
                    : "Non retribuito"}
                </dd>
              </div>
              <div>
                <dt className="muted">Luogo</dt>
                <dd className="font-medium">
                  {event.venueName && <>{event.venueName}<br /></>}
                  {event.address && <>{event.address}<br /></>}
                  <Link href={`/citta/${event.citySlug}`} className="text-brand-600 hover:underline">{event.city}</Link>
                </dd>
              </div>
              {event.capacity && (
                <div>
                  <dt className="muted">Posti</dt>
                  <dd className="font-medium">{event._count.participations} / {event.capacity} candidature</dd>
                </div>
              )}
              <div>
                <dt className="muted">Organizzatore</dt>
                <dd>
                  <Link href={`/artisti/${event.organizer.slug}`} className="font-medium text-brand-600 hover:underline">
                    {event.organizer.name}
                  </Link>
                </dd>
              </div>
            </dl>

            <div className="mt-6">
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

          <StaticMap
            latitude={event.latitude}
            longitude={event.longitude}
            label={event.venueName ?? event.city}
          />
        </aside>
      </div>
    </div>
  );
}

import { SITE, siteUrl } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";

type Json = Record<string, unknown>;

const clean = (obj: Json): Json =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

/** Organization + WebSite con SearchAction (sitelinks searchbox). */
export function organizationJsonLd(): Json {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: SITE.name,
        legalName: SITE.legalName,
        url: base,
        logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png"), width: 512, height: 512 },
        description: SITE.description,
        areaServed: { "@type": "Country", name: "Italia" },
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: SITE.name,
        description: SITE.description,
        inLanguage: "it-IT",
        publisher: { "@id": `${base}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${base}/cerca?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

type ArtistInput = {
  name: string;
  slug: string;
  headline?: string | null;
  bio?: string | null;
  image?: string | null;
  city?: string | null;
  region?: string | null;
  disciplines: string[];
  sameAs: string[];
  isBand?: boolean;
};

/** Person (o MusicGroup per le band) per la pagina profilo artista. */
export function artistJsonLd(a: ArtistInput): Json {
  const url = absoluteUrl(`/artisti/${a.slug}`);
  return clean({
    "@context": "https://schema.org",
    "@type": a.isBand ? "MusicGroup" : "Person",
    "@id": `${url}#artist`,
    name: a.name,
    url,
    description: a.headline || a.bio || undefined,
    image: a.image ? absoluteUrl(a.image) : undefined,
    jobTitle: a.disciplines[0],
    knowsAbout: a.disciplines.length ? a.disciplines : undefined,
    sameAs: a.sameAs.length ? a.sameAs : undefined,
    address: a.city
      ? clean({
          "@type": "PostalAddress",
          addressLocality: a.city,
          addressRegion: a.region ?? undefined,
          addressCountry: "IT",
        })
      : undefined,
    memberOf: { "@id": `${siteUrl()}/#organization` },
  });
}

type EventInput = {
  title: string;
  slug: string;
  description: string;
  coverImage?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  status: string;
  venueName?: string | null;
  address?: string | null;
  city: string;
  region?: string | null;
  latitude: number;
  longitude: number;
  isPaid: boolean;
  feeMin?: number | null;
  feeMax?: number | null;
  currency: string;
  organizerName: string;
  organizerSlug: string;
  capacity?: number | null;
};

/** Event: candidabile ai rich result "Eventi" di Google. */
export function eventJsonLd(e: EventInput): Json {
  const url = absoluteUrl(`/eventi/${e.slug}`);
  const statusMap: Record<string, string> = {
    PUBLISHED: "https://schema.org/EventScheduled",
    CANCELLED: "https://schema.org/EventCancelled",
    COMPLETED: "https://schema.org/EventScheduled",
  };

  return clean({
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${url}#event`,
    name: e.title,
    url,
    description: e.description.slice(0, 500),
    image: e.coverImage ? [absoluteUrl(e.coverImage)] : undefined,
    startDate: e.startsAt.toISOString(),
    endDate: e.endsAt ? e.endsAt.toISOString() : undefined,
    eventStatus: statusMap[e.status] ?? "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    maximumAttendeeCapacity: e.capacity ?? undefined,
    location: clean({
      "@type": "Place",
      name: e.venueName || e.city,
      address: clean({
        "@type": "PostalAddress",
        streetAddress: e.address ?? undefined,
        addressLocality: e.city,
        addressRegion: e.region ?? undefined,
        addressCountry: "IT",
      }),
      geo: { "@type": "GeoCoordinates", latitude: e.latitude, longitude: e.longitude },
    }),
    organizer: {
      "@type": "Organization",
      name: e.organizerName,
      url: absoluteUrl(`/artisti/${e.organizerSlug}`),
    },
    // Un ingaggio retribuito e' un'offerta rivolta all'artista.
    offers: e.isPaid
      ? clean({
          "@type": "Offer",
          url,
          price: e.feeMin ?? undefined,
          priceCurrency: e.currency,
          availability: "https://schema.org/InStock",
          validFrom: new Date().toISOString(),
        })
      : undefined,
  });
}

export function portfolioJsonLd(p: {
  title: string;
  slug: string;
  description?: string | null;
  mediaUrl: string;
  mediaType: string;
  year?: number | null;
  authorName: string;
  authorSlug: string;
  createdAt: Date;
}): Json {
  const url = absoluteUrl(`/portfolio/${p.slug}`);
  const typeMap: Record<string, string> = {
    image: "ImageObject",
    video: "VideoObject",
    audio: "AudioObject",
  };
  return clean({
    "@context": "https://schema.org",
    "@type": typeMap[p.mediaType] ?? "CreativeWork",
    "@id": `${url}#work`,
    name: p.title,
    url,
    contentUrl: absoluteUrl(p.mediaUrl),
    description: p.description ?? undefined,
    dateCreated: p.year ? `${p.year}` : p.createdAt.toISOString(),
    uploadDate: p.createdAt.toISOString(),
    author: {
      "@type": "Person",
      name: p.authorName,
      url: absoluteUrl(`/artisti/${p.authorSlug}`),
    },
  });
}

/** ItemList per le pagine directory: aiuta Google a capire l'elenco. */
export function itemListJsonLd(items: { name: string; path: string }[], listName: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.path),
    })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

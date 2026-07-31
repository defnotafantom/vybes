import Image from "next/image";
import Link from "next/link";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/constants";

export type EventCardData = {
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  category: string;
  startsAt: Date;
  city: string;
  venueName: string | null;
  isPaid: boolean;
  feeMin: number | null;
  feeMax: number | null;
};

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatFee(e: Pick<EventCardData, "isPaid" | "feeMin" | "feeMax">): string {
  if (!e.isPaid) return "Non retribuito";
  if (e.feeMin && e.feeMax && e.feeMax !== e.feeMin) return `${e.feeMin}–${e.feeMax} €`;
  return `${e.feeMin ?? 0} €`;
}

export function EventCard({ event, priority = false }: { event: EventCardData; priority?: boolean }) {
  const cat = EVENT_CATEGORIES[event.category as EventCategory] ?? EVENT_CATEGORIES.LIVE;
  return (
    <article className="card-interactive group overflow-hidden p-0">
      <Link href={`/eventi/${event.slug}`}>
        <div className="relative aspect-[16/9] overflow-hidden bg-brand-100 dark:bg-white/5">
          {event.coverImage && (
            <Image
              src={event.coverImage}
              alt={`Copertina di ${event.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-400 ease-out group-hover:scale-105"
              priority={priority}
            />
          )}
          <span className="absolute left-3 top-3 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {cat.label}
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-semibold leading-snug transition-colors group-hover:text-brand-600">{event.title}</h3>
          <p className="mt-1 text-sm muted">
            <time dateTime={event.startsAt.toISOString()}>{dateFmt.format(event.startsAt)}</time>
          </p>
          <p className="text-sm muted">
            {event.venueName ? `${event.venueName}, ` : ""}
            {event.city}
          </p>
          <p className="mt-3 line-clamp-2 text-sm muted">{event.description}</p>
          <p className="mt-3 text-sm font-medium text-brand-600">{formatFee(event)}</p>
        </div>
      </Link>
    </article>
  );
}

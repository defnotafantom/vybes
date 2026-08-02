import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
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
  month: "short",
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
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-sunken">
          {event.coverImage && (
            <OptimizedImage
              src={event.coverImage}
              alt={`Copertina di ${event.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={priority}
              className="object-cover transition-transform duration-600 ease-out group-hover:scale-[1.04]"
            />
          )}
          {/* Sfumatura in basso: separa la copertina dal testo anche quando
              l'immagine è chiara, senza dover mettere un bordo. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgb(var(--surface))] to-transparent"
          />
          <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1 text-fluid-xs font-semibold text-white backdrop-blur-md">
            {cat.label}
          </span>
        </div>

        <div className="p-5">
          <h3 className="text-fluid-base font-semibold leading-snug transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
            {event.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-fluid-xs text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              <time dateTime={event.startsAt.toISOString()}>{dateFmt.format(event.startsAt)}</time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {event.venueName ? `${event.venueName}, ` : ""}
              {event.city}
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-fluid-sm text-ink-muted">{event.description}</p>

          <p className="mt-4">
            <span className={event.isPaid ? "chip-gold" : "chip"}>{formatFee(event)}</span>
          </p>
        </div>
      </Link>
    </article>
  );
}
import Link from "next/link";
import { CalendarDays, MapPin, Music2, Users, GraduationCap, Trophy, Mic2 } from "lucide-react";
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

/**
 * Come si riempie una copertina che non c'è.
 *
 * Lo spazio 16:9 esisteva comunque: senza immagine restava un rettangolo
 * grigio alto centotrenta pixel sopra ogni titolo, ripetuto per tutta la
 * pagina degli ingaggi — cioè proprio la schermata che un artista guarda per
 * decidere se candidarsi.
 *
 * Riempirlo con un colore fisso lo renderebbe uniforme e altrettanto muto.
 * Qui ogni categoria porta la propria tinta e la propria icona, così una
 * griglia di annunci resta leggibile a colpo d'occhio anche quando nessuno ha
 * caricato una fotografia: si distingue un casting da una jam session prima
 * di leggere.
 *
 * È lo stesso principio degli avatar con le iniziali, dove la tinta deriva
 * dal nome — assenza di immagine non deve significare assenza di identità.
 * Quando la copertina c'è, questa non si vede.
 */
const SFONDO: Record<EventCategory, { classi: string; Icona: typeof Music2 }> = {
  LIVE: { classi: "from-brand-500/25 to-accent-500/10", Icona: Music2 },
  CASTING: { classi: "from-accent-500/25 to-brand-500/10", Icona: Users },
  WORKSHOP: { classi: "from-esito-ok-tinta/20 to-accent-500/10", Icona: GraduationCap },
  CONTEST: { classi: "from-gold-500/25 to-brand-500/10", Icona: Trophy },
  JAM: { classi: "from-brand-400/25 to-esito-attesa-tinta/10", Icona: Mic2 },
};

export function formatFee(e: Pick<EventCardData, "isPaid" | "feeMin" | "feeMax">): string {
  if (!e.isPaid) return "Non retribuito";
  if (e.feeMin && e.feeMax && e.feeMax !== e.feeMin) return `${e.feeMin}–${e.feeMax} €`;
  return `${e.feeMin ?? 0} €`;
}

export function EventCard({ event, priority = false }: { event: EventCardData; priority?: boolean }) {
  const chiave = (event.category in EVENT_CATEGORIES ? event.category : "LIVE") as EventCategory;
  const cat = EVENT_CATEGORIES[chiave];
  const sfondo = SFONDO[chiave];

  return (
    <article className="card-interactive group overflow-hidden p-0">
      <Link href={`/eventi/${event.slug}`}>
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-sunken">
          {event.coverImage ? (
            <OptimizedImage
              src={event.coverImage}
              alt={`Copertina di ${event.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={priority}
              className="object-cover transition-transform duration-600 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div
              aria-hidden="true"
              className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${sfondo.classi}`}
            >
              <sfondo.Icona
                className="h-10 w-10 text-ink/25 transition-transform duration-400 ease-out group-hover:scale-110"
                strokeWidth={1.5}
              />
            </div>
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
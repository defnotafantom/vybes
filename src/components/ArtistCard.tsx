import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";
import { reputazioneMassima } from "@/lib/reputazione";

export type ArtistCardData = {
  slug: string;
  name: string;
  headline: string | null;
  image: string | null;
  city: string | null;
  disciplines: string[];
  /**
   * La reputazione, non il livello.
   *
   * La scheda mostrava «Lv. 7» in un elenco che è ordinato per reputazione:
   * il numero visibile e il criterio d'ordinamento erano due cose diverse, e
   * il primo misurava quanto quella persona usa il sito — informazione che a
   * un organizzatore non serve per decidere se aprirne il profilo.
   */
  reputation: number;
  isVerified: boolean;
};

export function ArtistCard({
  artist,
  priority = false,
}: {
  artist: ArtistCardData;
  priority?: boolean;
}) {
  return (
    <article className="card-glow card-interactive group">
      <Link href={`/artisti/${artist.slug}`} className="flex items-start gap-4">
        <Avatar
          name={artist.name}
          src={artist.image}
          size="lg"
          priority={priority}
          className="transition-transform duration-250 ease-out group-hover:scale-105"
        />

        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 truncate text-fluid-base font-semibold transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
            {artist.name}
            {artist.isVerified && <VerifiedBadge />}
          </h3>

          {artist.headline && (
            <p className="mt-1 line-clamp-2 text-fluid-sm text-ink-muted">{artist.headline}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-fluid-xs">
            {artist.disciplines.slice(0, 2).map((d) => (
              <span key={d} className="chip">
                {d}
              </span>
            ))}
            {artist.city && (
              <span className="inline-flex items-center gap-1 text-ink-faint">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {artist.city}
              </span>
            )}
            <span className="ml-auto shrink-0 tabular-nums text-ink-faint">
              {artist.reputation}
              <span className="opacity-60">/{reputazioneMassima()}</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";

export type ArtistCardData = {
  slug: string;
  name: string;
  headline: string | null;
  image: string | null;
  city: string | null;
  disciplines: string[];
  level: number;
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
          <h3 className="flex items-center gap-1.5 truncate text-fluid-base font-semibold transition-colors group-hover:text-brand-400">
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
            <span className="tabular-nums text-ink-faint">Lv. {artist.level}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
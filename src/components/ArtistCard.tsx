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

export function ArtistCard({ artist, priority = false }: { artist: ArtistCardData; priority?: boolean }) {
  return (
    <article className="card-interactive group">
      <Link href={`/artisti/${artist.slug}`} className="flex items-start gap-4">
        <Avatar
          name={artist.name}
          src={artist.image}
          size="lg"
          priority={priority}
          className="transition-transform duration-250 ease-out group-hover:scale-105"
        />
        <div className="min-w-0">
          <h3 className="flex items-center gap-1 truncate font-semibold transition-colors group-hover:text-brand-600">
            {artist.name}
{artist.isVerified && <VerifiedBadge />}
          </h3>
          {artist.headline && <p className="line-clamp-2 text-sm muted">{artist.headline}</p>}
          <p className="mt-2 flex flex-wrap gap-2 text-xs muted">
            {artist.city && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {artist.city}
              </span>
            )}
            {artist.disciplines.slice(0, 2).map((d) => (
              <span key={d} className="chip">
                {d}
              </span>
            ))}
            <span>Lv. {artist.level}</span>
          </p>
        </div>
      </Link>
    </article>
  );
}

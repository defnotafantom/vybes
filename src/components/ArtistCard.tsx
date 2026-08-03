import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";
import { disciplineBySlug } from "@/lib/constants";

export type ArtistCardData = {
  slug: string;
  name: string;
  headline: string | null;
  image: string | null;
  city: string | null;
  disciplines: string[];
  /**
   * Serve ancora al tipo perché le pagine che usano questa scheda ordinano
   * per reputazione e la selezionano comunque: toglierla dalla query per
   * risparmiare una colonna significherebbe non poter più ordinare.
   * Semplicemente, non si disegna.
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
            {/* L'etichetta, non lo slug.
                Qui compariva `cantanti`, `dj`, `videomaker`: le chiavi con cui
                il database indicizza le discipline, minuscole e al plurale.
                Dieci centimetri più in su, nella stessa pagina, i filtri
                mostrano «Cantanti» e «DJ» perché passano da `DISCIPLINES` —
                quindi il difetto non si notava confrontando, si notava solo
                leggendo una scheda.

                E non è una maiuscola: «cantanti» è una categoria, «Cantante»
                è quello che quella persona fa. Sulla scheda di qualcuno serve
                il secondo. */}
            {artist.disciplines.slice(0, 2).map((d) => (
              <span key={d} className="chip">
                {disciplineBySlug(d)?.label ?? d}
              </span>
            ))}
            {artist.city && (
              <span className="inline-flex items-center gap-1 text-ink-faint">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {artist.city}
              </span>
            )}
            {/* Il punteggio non compare più qui.
                In una scheda d'elenco «53/110» è un numero senza etichetta e
                senza scala di riferimento: chi arriva da una ricerca non sa
                cosa misuri, e occupava l'angolo che l'occhio guarda per
                ultimo — cioè quello che resta impresso.

                Serve ancora, e sta dove si può spiegare: sulla pagina del
                profilo, accanto a «Reputazione» e con l'elenco di ciò che
                risulta verificato. L'elenco continua a essere ordinato per
                reputazione, quindi l'informazione c'è comunque — nella
                posizione, che è il modo in cui una directory la comunica da
                sempre senza doverla scrivere. */}
          </div>
        </div>
      </Link>
    </article>
  );
}
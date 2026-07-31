/**
 * Primitive per gli stati di caricamento.
 *
 * Gli skeleton non servono a "riempire": servono a **riservare lo spazio**
 * che il contenuto occuperà. Se le proporzioni sono sbagliate, quando i dati
 * arrivano la pagina scatta e quello scatto è Cumulative Layout Shift, che
 * Google misura. Per questo ogni skeleton qui replica il rapporto d'aspetto
 * del componente che sostituisce.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`shimmer rounded-lg bg-black/[0.06] dark:bg-white/[0.06] ${className}`}
    />
  );
}

/** Riproduce l'ingombro di ArtistCard: avatar 64px più due righe. */
export function ArtistCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Riproduce EventCard, copertina 16/9 compresa. */
export function EventCardSkeleton() {
  return (
    <div className="surface overflow-hidden shadow-subtle">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-2 p-5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/** Intestazione di pagina: titolo più sottotitolo. */
export function PageHeaderSkeleton({ withFilters = false }: { withFilters?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-full max-w-xl" />
      {withFilters && (
        <div className="flex flex-wrap gap-2 pt-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}

export function CardGridSkeleton({
  count = 6,
  variant = "artist",
}: {
  count?: number;
  variant?: "artist" | "event";
}) {
  const Item = variant === "artist" ? ArtistCardSkeleton : EventCardSkeleton;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}

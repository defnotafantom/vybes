// Vedi `SkeletonArtisti` e ADR-028: un `loading.tsx` copre tutto il
// segmento, e i figli con un confine di Suspense sopra non possono più
// rispondere 404. Il confine si dichiara nella pagina che lo usa.
import { Skeleton, PageHeaderSkeleton } from "@/components/Skeleton";

export function SkeletonCitta() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Caricamento delle città</span>
      <PageHeaderSkeleton />
      <div className="mt-10 space-y-10">
        {Array.from({ length: 3 }).map((_, region) => (
          <div key={region}>
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

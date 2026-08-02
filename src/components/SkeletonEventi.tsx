// Vedi `SkeletonArtisti` e ADR-028: un `loading.tsx` copre tutto il
// segmento, e i figli con un confine di Suspense sopra non possono più
// rispondere 404. Il confine si dichiara nella pagina che lo usa.
import { PageHeaderSkeleton, CardGridSkeleton } from "@/components/Skeleton";

export function SkeletonEventi() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Caricamento degli ingaggi</span>
      <PageHeaderSkeleton withFilters />
      <div className="mt-8">
        <CardGridSkeleton count={6} variant="event" />
      </div>
    </div>
  );
}

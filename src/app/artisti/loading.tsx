import { PageHeaderSkeleton, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Caricamento degli artisti</span>
      <PageHeaderSkeleton withFilters />
      <div className="mt-8">
        <CardGridSkeleton count={9} variant="artist" />
      </div>
    </div>
  );
}

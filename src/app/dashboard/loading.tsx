import { Skeleton, PostSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Caricamento della dashboard</span>
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="card space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
      <aside className="space-y-6">
        <div className="card space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="card space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </aside>
    </div>
  );
}

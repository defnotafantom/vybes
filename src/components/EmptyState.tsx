import Link from "next/link";

export function EmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="card animate-fade-in py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm muted">{body}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary mt-5">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

import Link from "next/link";

/**
 * Paginazione con link reali (<a href>): i crawler seguono solo ancore,
 * non i bottoni con onClick.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => (p === 1 ? basePath : `${basePath}?page=${p}`);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <nav aria-label="Paginazione" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link rel="prev" href={href(page - 1)} className="btn-ghost">
          Precedente
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="muted">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={p === page ? "btn-primary" : "btn-ghost"}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link rel="next" href={href(page + 1)} className="btn-ghost">
          Successiva
        </Link>
      )}
    </nav>
  );
}

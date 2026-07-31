import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";

export type Crumb = { name: string; path: string };

/**
 * Breadcrumb visibili + BreadcrumbList JSON-LD: Google le usa per
 * sostituire l'URL nudo nella SERP con un percorso leggibile.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const full: Crumb[] = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(full)} />
      <nav aria-label="Percorso di navigazione" className="mb-6 text-sm muted">
        <ol className="flex flex-wrap items-center gap-1">
          {full.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i === full.length - 1 ? (
                <span aria-current="page" className="font-medium">{c.name}</span>
              ) : (
                <Link href={c.path} className="hover:text-brand-600">{c.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

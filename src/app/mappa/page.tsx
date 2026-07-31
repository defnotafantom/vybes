import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MapExplorer, type MapPoint } from "@/components/MapExplorer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/constants";
import "leaflet/dist/leaflet.css";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Mappa degli ingaggi per artisti in Italia",
  description:
    "Esplora sulla mappa concerti, casting e workshop aperti agli artisti. Filtra per raggio dalla tua posizione e candidati direttamente.",
  path: "/mappa",
  keywords: ["eventi vicino a me", "ingaggi musicisti mappa", "casting vicino a me"],
});

export default async function MappaPage() {
  const events = await prisma.event.findMany({
    where: { isPublic: true, status: "PUBLISHED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 500,
    select: {
      slug: true, title: true, city: true, latitude: true, longitude: true,
      startsAt: true, category: true, isPaid: true, feeMin: true, feeMax: true,
    },
  });

  const points: MapPoint[] = events.map((e) => ({
    slug: e.slug,
    title: e.title,
    city: e.city,
    lat: e.latitude,
    lng: e.longitude,
    startsAt: e.startsAt.toISOString(),
    category: EVENT_CATEGORIES[e.category as EventCategory]?.label ?? "Evento",
    fee: e.isPaid ? `${e.feeMin ?? 0} €` : "Non retribuito",
  }));

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Mappa", path: "/mappa" }]} />
      <h1 className="text-3xl font-bold sm:text-4xl">Mappa degli ingaggi</h1>
      <p className="mt-3 max-w-2xl muted">
        {points.length} opportunità aperte in Italia. La mappa è interattiva; per la versione
        indicizzabile consulta l&apos;{" "}
        <Link href="/eventi" className="text-brand-600 hover:underline">elenco completo degli ingaggi</Link>.
      </p>

      <div className="mt-8">
        {/* Se Leaflet non parte resta l'elenco testuale qui sotto, che è poi
            quello che leggono i crawler. */}
        <ErrorBoundary
          label="mappa"
          fallback={
            <div className="card">
              <p className="font-medium">La mappa non si è caricata.</p>
              <p className="mt-1 text-sm muted">Trovi tutti gli ingaggi nell&apos;elenco qui sotto.</p>
            </div>
          }
        >
          <MapExplorer points={points} center={{ lat: 42.5, lng: 12.5 }} />
        </ErrorBoundary>
      </div>

      {/* Elenco testuale: la mappa e' client-side, questo lo leggono i crawler */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">Tutti gli ingaggi sulla mappa</h2>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {points.map((p) => (
            <li key={p.slug}>
              <Link href={`/eventi/${p.slug}`} className="muted hover:text-brand-600">
                {p.title} — {p.city}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

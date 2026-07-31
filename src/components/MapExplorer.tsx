"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { haversineKm } from "@/lib/cities";

// Leaflet tocca window: caricato solo lato client, fuori dal bundle iniziale.
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

export type MapPoint = {
  slug: string;
  title: string;
  city: string;
  lat: number;
  lng: number;
  startsAt: string;
  category: string;
  fee: string;
};

export function MapExplorer({
  points,
  center,
}: {
  points: MapPoint[];
  center: { lat: number; lng: number };
}) {
  const [radius, setRadius] = useState(50);
  const [origin, setOrigin] = useState(center);
  const [geoError, setGeoError] = useState<string | null>(null);

  const visible = useMemo(
    () => points.filter((p) => haversineKm(origin, { lat: p.lat, lng: p.lng }) <= radius),
    [points, origin, radius]
  );

  function locate() {
    if (!navigator.geolocation) {
      setGeoError("Il browser non supporta la geolocalizzazione");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Permesso negato: usa i filtri per città")
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card overflow-hidden p-0">
        <MapContainer
          center={[origin.lat, origin.lng]}
          zoom={9}
          scrollWheelZoom={false}
          style={{ height: 520, width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visible.map((p) => (
            <Marker key={p.slug} position={[p.lat, p.lng]}>
              <Popup>
                <strong>{p.title}</strong>
                <br />
                {p.city} · {p.fee}
                <br />
                <Link href={`/eventi/${p.slug}`}>Vedi ingaggio</Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="space-y-4">
        <div className="card">
          <button type="button" className="btn-ghost w-full" onClick={locate}>
            Usa la mia posizione
          </button>
          {geoError && <p className="mt-2 text-sm text-red-600">{geoError}</p>}
          <label htmlFor="radius" className="mt-4 block text-sm font-medium">
            Raggio: {radius} km
          </label>
          <input
            id="radius"
            type="range"
            min={5}
            max={300}
            step={5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="mt-3 text-sm muted">{visible.length} ingaggi nel raggio selezionato</p>
        </div>

        <ul className="space-y-3">
          {visible.slice(0, 20).map((p) => (
            <li key={p.slug} className="card p-4">
              <Link href={`/eventi/${p.slug}`} className="font-medium hover:text-brand-600">
                {p.title}
              </Link>
              <p className="text-sm muted">
                {p.city} · {new Date(p.startsAt).toLocaleDateString("it-IT")} · {p.fee}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

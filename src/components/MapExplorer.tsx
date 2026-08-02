"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { haversineKm } from "@/lib/cities";
import { dataBreve } from "@/lib/date";

// Leaflet tocca window: caricato solo lato client, fuori dal bundle iniziale.
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

/**
 * Il marker.
 *
 * Leaflet usa per impostazione predefinita tre file PNG che cerca accanto al
 * proprio foglio di stile. Con un bundler quei percorsi non esistono più, e il
 * risultato è che i pin non si vedono: la mappa carica, le tile ci sono, i
 * popup funzionano, e i marker sono invisibili. È il difetto più noto di
 * Leaflet e non dà nessun errore.
 *
 * La soluzione più comune è rimappare le tre URL sulle immagini importate.
 * Qui si fa un'altra cosa: il pin è un `divIcon`, cioè HTML. Niente file da
 * risolvere, niente richieste di rete, e il colore è quello del progetto
 * invece dell'azzurro di serie. Un marker che deve solo dire «qui» non ha
 * bisogno di essere un'immagine.
 */
function creaIcona(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    html: `
      <span style="
        display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:#8b5cf6;border:2px solid #05030c;
        box-shadow:0 3px 8px rgb(0 0 0 / .45);
      "></span>`,
    // L'ancora è la punta in basso, non il centro: un pin ancorato al centro
    // indica un luogo spostato di dieci metri verso nord.
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -18],
  });
}

/**
 * Sposta la mappa quando cambia il centro.
 *
 * `MapContainer` legge `center` solo al montaggio: premendo «usa la mia
 * posizione» l'elenco si filtrava correttamente ma la mappa restava dov'era, e
 * sembrava che il pulsante non funzionasse. Serve un componente figlio, perché
 * `useMap` esiste solo dentro il contesto della mappa.
 */
const SeguiCentro = dynamic(
  async () => {
    const { useMap } = await import("react-leaflet");
    return function SeguiCentro({ lat, lng }: { lat: number; lng: number }) {
      const map = useMap();
      useEffect(() => {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 10), { duration: 0.8 });
      }, [map, lat, lng]);
      return null;
    };
  },
  { ssr: false }
);

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
  const [inCorso, setInCorso] = useState(false);

  // L'icona si costruisce dopo il montaggio: `leaflet` tocca `window` e non
  // può essere importato durante il rendering sul server.
  const [icona, setIcona] = useState<import("leaflet").DivIcon | null>(null);
  useEffect(() => {
    let vivo = true;
    import("leaflet").then((L) => {
      if (vivo) setIcona(creaIcona(L));
    });
    return () => {
      vivo = false;
    };
  }, []);

  const visible = useMemo(
    () => points.filter((p) => haversineKm(origin, { lat: p.lat, lng: p.lng }) <= radius),
    [points, origin, radius]
  );

  function locate() {
    if (!navigator.geolocation) {
      setGeoError("Il browser non supporta la geolocalizzazione");
      return;
    }
    setGeoError(null);
    setInCorso(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setInCorso(false);
      },
      (err) => {
        // Messaggi distinti: «permesso negato» e «non ti trovo» richiedono
        // due cose diverse a chi legge, e dirle uguali costringe a indovinare.
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permesso negato. Puoi consentire la posizione dalle impostazioni del browser, oppure sfogliare per città."
            : "Non siamo riusciti a rilevare la posizione. Riprova, o sfoglia per città."
        );
        setInCorso(false);
      },
      // Dieci secondi e una posizione vecchia fino a cinque minuti: senza
      // limite, su alcuni dispositivi la richiesta resta appesa senza mai
      // rispondere né fallire.
      { timeout: 10_000, maximumAge: 300_000 }
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card overflow-hidden p-0">
        <MapContainer
          center={[origin.lat, origin.lng]}
          zoom={9}
          scrollWheelZoom={false}
          /* 520px fissi su un telefono alto 667 lasciano fuori i comandi e
             costringono a scorrere per capire cosa si sta guardando. `dvh` e
             non `vh`: su iOS `vh` misura la finestra senza la barra degli
             indirizzi, quindi il fondo della mappa resterebbe nascosto sotto
             di essa proprio mentre la si scorre. */
          className="h-[60dvh] max-h-[520px] min-h-72 w-full sm:h-[520px]"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <SeguiCentro lat={origin.lat} lng={origin.lng} />

          {visible.map((p) => (
            <Marker key={p.slug} position={[p.lat, p.lng]} icon={icona ?? undefined}>
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
          <button type="button" className="btn-ghost w-full" disabled={inCorso} onClick={locate}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {inCorso ? "Ti sto cercando…" : "Usa la mia posizione"}
          </button>
          {geoError && (
            <p role="status" className="mt-3 text-fluid-xs text-ink-muted">
              {geoError}
            </p>
          )}
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
                {p.city} · {dataBreve(p.startsAt)} · {p.fee}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

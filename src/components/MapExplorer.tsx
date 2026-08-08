"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search, X } from "lucide-react";
import { haversineKm } from "@/lib/cities";
import { dataBreve } from "@/lib/date";
import { conta } from "@/lib/testo";
import {
  LIMITI,
  ZOOM_MINIMO,
  ZOOM_INIZIALE,
  raggruppa,
  riquadroDi,
  type Gruppo,
} from "@/lib/mappa";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/constants";

// Leaflet tocca window: caricato solo lato client, fuori dal bundle iniziale.
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

/**
 * Il colore per categoria.
 *
 * Cinque pin tutti uguali costringono ad aprirne uno per sapere se è un
 * concerto o un casting: su una mappa con cinquanta punti significa cinquanta
 * clic per farsi un'idea di cosa c'è in giro, che è esattamente la domanda a
 * cui una mappa dovrebbe rispondere a colpo d'occhio.
 *
 * Il colore non è però l'unico segnale: il popup dice sempre la categoria per
 * esteso, e l'elenco a lato la ripete. Chi non distingue il viola dall'ambra —
 * e il 5% degli uomini non distingue il rosso dal verde — non perde niente.
 */
const TINTA: Record<string, string> = {
  LIVE: "#8b5cf6",
  CASTING: "#f59e0b",
  WORKSHOP: "#06b6d4",
  CONTEST: "#ec4899",
  JAM: "#22c55e",
};
const TINTA_ALTRO = "#8b5cf6";

/**
 * Il pin di un singolo annuncio.
 *
 * Leaflet usa per impostazione predefinita tre file PNG che cerca accanto al
 * proprio foglio di stile. Con un bundler quei percorsi non esistono più, e il
 * risultato è che i pin non si vedono: la mappa carica, le tile ci sono, i
 * popup funzionano, e i marker sono invisibili. È il difetto più noto di
 * Leaflet e non dà nessun errore.
 *
 * La soluzione più comune è rimappare le tre URL sulle immagini importate.
 * Qui si fa un'altra cosa: il pin è un `divIcon`, cioè HTML. Niente file da
 * risolvere, niente richieste di rete, e il colore è quello della categoria
 * invece dell'azzurro di serie.
 *
 * `1.5px` di bordo chiaro attorno al colore: su una mappa scura un pin scuro
 * sparisce, su una chiara sparisce uno chiaro. Il contorno lo stacca da
 * entrambe senza dover sapere quale delle due c'è sotto.
 */
function iconaPunto(L: typeof import("leaflet"), categoria: string) {
  const tinta = TINTA[categoria] ?? TINTA_ALTRO;
  return L.divIcon({
    className: "",
    html: `
      <span style="
        display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${tinta};
        border:1.5px solid rgba(255,255,255,.9);
        box-shadow:0 2px 6px rgb(0 0 0 / .5);
      "></span>`,
    // L'ancora è la punta in basso, non il centro: un pin ancorato al centro
    // indica un luogo spostato di dieci metri verso nord.
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -16],
  });
}

/**
 * Il simbolo di un gruppo: un cerchio con dentro quanti ne contiene.
 *
 * Cresce con la quantità, ma per **radice quadrata** e non in proporzione:
 * un gruppo di cento non deve essere venti volte più largo di uno di cinque,
 * o coprirebbe mezza regione. Con la radice l'area cresce linearmente col
 * numero, che è il modo in cui l'occhio confronta i cerchi.
 */
function iconaGruppo(L: typeof import("leaflet"), quanti: number) {
  const lato = Math.round(Math.min(52, 26 + Math.sqrt(quanti) * 5));
  return L.divIcon({
    className: "",
    html: `
      <span style="
        display:flex;align-items:center;justify-content:center;
        width:${lato}px;height:${lato}px;border-radius:50%;
        background:rgba(139,92,246,.88);
        border:2px solid rgba(255,255,255,.92);
        box-shadow:0 3px 10px rgb(0 0 0 / .45);
        color:#fff;font-weight:700;font-size:${lato > 38 ? 14 : 12}px;
        font-variant-numeric:tabular-nums;
      ">${quanti}</span>`,
    iconSize: [lato, lato],
    iconAnchor: [lato / 2, lato / 2],
  });
}

/**
 * Il ponte fra Leaflet e lo stato di React.
 *
 * `useMap` e `useMapEvents` esistono solo dentro il contesto del
 * `MapContainer`, quindi la mappa non è raggiungibile dal componente che la
 * monta. Questo figlio la passa in su una volta e poi tiene aggiornato lo
 * zoom: il raggruppamento dipende dallo zoom, e senza questo restava quello
 * calcolato al montaggio — i gruppi non si sarebbero mai aperti.
 */
const PonteMappa = dynamic(
  async () => {
    const { useMap, useMapEvents } = await import("react-leaflet");
    return function PonteMappa({
      onPronta,
      onZoom,
    }: {
      onPronta: (m: import("leaflet").Map) => void;
      onZoom: (z: number) => void;
    }) {
      const map = useMap();

      useEffect(() => {
        onPronta(map);
        onZoom(map.getZoom());

        /* ── Leaflet crede di essere grande quanto era al montaggio ──
         *
         * Calcola la propria dimensione una volta sola, all'inizializzazione.
         * Ma qui il contenitore è una cella di griglia accanto a una colonna
         * da 360px, e la sua larghezza definitiva arriva **dopo** — quando il
         * foglio di stile è applicato, i caratteri sono caricati e la griglia
         * si è assestata. Nel frattempo la mappa ha già deciso, e da lì in poi
         * ogni `fitBounds` e ogni centratura sono calcolati su una misura
         * sbagliata: l'inquadratura risulta spostata e i pin ai bordi finiscono
         * fuori.
         *
         * È il difetto più comune di Leaflet dentro un layout moderno, e non
         * dà nessun errore: dà una mappa storta.
         *
         * `invalidateSize()` gli fa rimisurare il contenitore. Il
         * `ResizeObserver` ripete la cosa a ogni cambio di dimensione — la
         * finestra che si ridimensiona, il telefono che ruota, la colonna dei
         * filtri che cresce quando compare il cursore del raggio.
         */
        const rimisura = () => map.invalidateSize({ animate: false });
        rimisura();

        const contenitore = map.getContainer();
        const osservatore = new ResizeObserver(rimisura);
        osservatore.observe(contenitore);

        return () => osservatore.disconnect();
      }, [map, onPronta, onZoom]);

      useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
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
  /** La chiave, non l'etichetta: serve al colore e al filtro. */
  categoria: string;
  categoryLabel: string;
  isPaid: boolean;
  fee: string;
};

const CATEGORIE = Object.entries(EVENT_CATEGORIES) as [EventCategory, { label: string }][];

export function MapExplorer({
  points,
  center,
}: {
  points: MapPoint[];
  center: { lat: number; lng: number };
}) {
  const [radius, setRadius] = useState(50);
  const [origin, setOrigin] = useState(center);
  /**
   * Il filtro per distanza si attiva solo dopo la geolocalizzazione.
   *
   * All'apertura il centro era il baricentro geografico dell'Italia e il
   * raggio cinquanta chilometri: in mezzo alla Toscana, dove non c'è nessun
   * ingaggio. La pagina si presentava dicendo «0 ingaggi nel raggio
   * selezionato» — che è vero e completamente fuorviante, perché gli ingaggi
   * ci sono e sono sei.
   *
   * Un raggio ha senso solo attorno a un punto che significa qualcosa. Finché
   * quel punto non c'è, si mostra tutto.
   */
  const [filtraPerRaggio, setFiltraPerRaggio] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  // ── I filtri, che prima vivevano in un'altra pagina ──
  const [categoria, setCategoria] = useState<string | null>(null);
  const [soloPagati, setSoloPagati] = useState(false);
  const [testo, setTesto] = useState("");

  const [mappa, setMappa] = useState<import("leaflet").Map | null>(null);
  const [zoom, setZoom] = useState(ZOOM_INIZIALE);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  // Leaflet tocca `window` e non può essere importato durante il rendering sul
  // server: si carica dopo il montaggio, e finché non c'è i marker usano
  // l'icona di serie invece di sparire.
  useEffect(() => {
    let vivo = true;
    import("leaflet").then((mod) => {
      if (vivo) setL(mod);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const visible = useMemo(() => {
    const q = testo.trim().toLowerCase();
    return points.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (soloPagati && !p.isPaid) return false;
      if (q && !`${p.title} ${p.city}`.toLowerCase().includes(q)) return false;
      if (filtraPerRaggio && haversineKm(origin, { lat: p.lat, lng: p.lng }) > radius) return false;
      return true;
    });
  }, [points, categoria, soloPagati, testo, filtraPerRaggio, origin, radius]);

  const gruppi = useMemo(() => raggruppa(visible, zoom), [visible, zoom]);

  /**
   * All'apertura si inquadra il contenuto, non un punto fisso.
   *
   * ── Il difetto ──
   *
   * `center={[42, 12.5]} zoom={6}` è la coppia giusta solo per un riquadro di
   * una certa forma. Il riquadro vero è alto e stretto — la colonna dei filtri
   * si prende trecentosessanta pixel — e a zoom 6 ci sta dentro la penisola da
   * Firenze in giù: **Milano, Torino e Bologna restano fuori dallo schermo**.
   *
   * Il risultato, visto in un video: si apre la mappa, scrive «5 ingaggi in
   * tutta Italia», e di pin non se ne vede nemmeno uno. Tre dei cinque erano
   * al nord, fuori dal riquadro. La mappa funzionava e non mostrava niente,
   * che è il modo peggiore di funzionare.
   *
   * ── La correzione ──
   *
   * `fitBounds` sui punti veri: l'inquadratura si adatta alla forma del
   * riquadro invece di sperare che combacino, e su qualunque schermo si vede
   * quello che c'è. Se non c'è niente da mostrare — filtri troppo stretti — si
   * inquadra l'Italia, che è il ripiego onesto.
   *
   * Solo all'apertura: rifarlo a ogni cambio di filtro strapperebbe la vista
   * sotto le mani di chi si è appena spostato a mano su una città.
   */
  const [inquadrata, setInquadrata] = useState(false);
  useEffect(() => {
    if (!mappa || inquadrata) return;

    // Prima di inquadrare, rimisurare: vedi la nota in `PonteMappa`. Senza
    // questa riga il rettangolo si adatta a una larghezza che non esiste più.
    mappa.invalidateSize({ animate: false });

    if (visible.length > 0) {
      const lat = visible.map((p) => p.lat);
      const lng = visible.map((p) => p.lng);
      mappa.fitBounds(
        [
          [Math.min(...lat), Math.min(...lng)],
          [Math.max(...lat), Math.max(...lng)],
        ],
        // Un margine generoso: senza, i pin ai bordi finiscono sotto i comandi
        // dello zoom e sotto l'attribuzione. `maxZoom` evita che due annunci
        // nello stesso quartiere aprano la mappa sul catasto.
        { padding: [48, 48], maxZoom: 11 }
      );
    } else {
      mappa.fitBounds(LIMITI, { padding: [16, 16] });
    }
    setInquadrata(true);
  }, [mappa, visible, inquadrata]);

  const apriGruppo = useCallback(
    (g: Gruppo<MapPoint>) => {
      if (!mappa) return;
      const riquadro = riquadroDi(g);
      const [[sudLat, ovestLng], [nordLat, estLng]] = riquadro;
      // Punti che coincidono davvero — due annunci nello stesso locale — danno
      // un rettangolo di area zero, e `fitBounds` su quello salterebbe allo
      // zoom massimo mostrando quattro isolati vuoti. In quel caso ci si
      // avvicina di un gradino e basta: il gruppo si aprirà, o resterà chiuso
      // perché quei punti sono davvero nello stesso posto e il popup li
      // elencherà tutti.
      if (nordLat - sudLat < 1e-6 && estLng - ovestLng < 1e-6) {
        mappa.setView([g.lat, g.lng], Math.min(mappa.getMaxZoom(), mappa.getZoom() + 2));
        return;
      }
      mappa.fitBounds(riquadro, { padding: [56, 56], maxZoom: 15 });
    },
    [mappa]
  );

  const filtriAttivi = Boolean(categoria) || soloPagati || testo.trim().length > 0 || filtraPerRaggio;

  function azzera() {
    setCategoria(null);
    setSoloPagati(false);
    setTesto("");
    setFiltraPerRaggio(false);
  }

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
        setFiltraPerRaggio(true);
        setInCorso(false);
        mappa?.flyTo([pos.coords.latitude, pos.coords.longitude], 10, { duration: 0.8 });
      },
      (err) => {
        // Messaggi distinti: «permesso negato» e «non ti trovo» richiedono
        // due cose diverse a chi legge, e dirle uguali costringe a indovinare.
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permesso negato. Puoi consentire la posizione dalle impostazioni del browser, oppure cercare per città qui sopra."
            : "Non siamo riusciti a rilevare la posizione. Riprova, o cerca per città qui sopra."
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
          zoom={ZOOM_MINIMO}
          scrollWheelZoom={false}
          /* ── La mappa non esce dall'Italia ──
             `maxBounds` da solo lascia trascinare fuori e poi rimbalza con
             un'elastica; `maxBoundsViscosity: 1` la rende un muro, che è la
             stessa cosa che si sente sul bordo di una lista che non scorre
             più. `minZoom` chiude l'altra via d'uscita, che è allontanarsi
             finché l'Italia diventa un puntino in mezzo all'Atlantico.
             Vedi `src/lib/mappa.ts`. */
          maxBounds={LIMITI}
          maxBoundsViscosity={1}
          minZoom={ZOOM_MINIMO}
          maxZoom={17}
          /* ── Perché il riquadro è alto ──
             L'Italia è **alta e stretta**: dodici gradi di latitudine contro
             tredici di longitudine, che in proiezione di Mercatore diventano
             circa tre di larghezza ogni quattro di altezza. Un riquadro
             panoramico la fa entrare solo rimpicciolendola in mezzo al mare,
             e a 560px ne tagliava direttamente il nord.

             `dvh` e non `vh`: su iOS `vh` misura la finestra senza la barra
             degli indirizzi, quindi il fondo della mappa resterebbe nascosto
             sotto di essa proprio mentre la si scorre. */
          className="mappa-tema h-[68dvh] max-h-[820px] min-h-80 w-full lg:h-[760px]"
        >
          {/* `mappa-tema` inverte le tile quando il tema è scuro: vedi la
              nota in globals.css. Le tile di OpenStreetMap sono chiare, e un
              rettangolo bianco in mezzo a una pagina scura è la cosa più
              vistosa del sito. */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            /* Le tile fuori dai confini non si chiedono nemmeno: sono
                richieste di rete per pixel che nessuno vedrà. */
            bounds={LIMITI}
            minZoom={ZOOM_MINIMO}
            maxZoom={17}
          />
          <PonteMappa onPronta={setMappa} onZoom={setZoom} />

          {gruppi.map((g) => {
            const solo = g.elementi.length === 1 ? g.elementi[0] : null;

            if (!solo) {
              return (
                <Marker
                  key={`g-${g.lat.toFixed(5)}-${g.lng.toFixed(5)}`}
                  position={[g.lat, g.lng]}
                  icon={L ? iconaGruppo(L, g.elementi.length) : undefined}
                  eventHandlers={{ click: () => apriGruppo(g) }}
                  /* Un gruppo è un comando, non un'etichetta: senza queste due
                     righe chi naviga da tastiera trova cinquanta punti che non
                     rispondono a Invio, e chi usa uno screen reader sente
                     «marker» cinquanta volte senza sapere cosa contengono. */
                  keyboard
                  alt={`${g.elementi.length} ingaggi in questa zona — apri`}
                />
              );
            }

            return (
              <Marker
                key={solo.slug}
                position={[solo.lat, solo.lng]}
                icon={L ? iconaPunto(L, solo.categoria) : undefined}
                alt={`${solo.title}, ${solo.city}`}
              >
                <Popup>
                  <strong>{solo.title}</strong>
                  <br />
                  {solo.categoryLabel} · {solo.city}
                  <br />
                  {dataBreve(solo.startsAt)} · {solo.fee}
                  <br />
                  <Link href={`/eventi/${solo.slug}`}>Vedi ingaggio</Link>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="space-y-4">
        {/* ── I filtri stanno qui, non in un'altra pagina ──
            Cercare per categoria stava in /eventi e guardare dov'è stava in
            /mappa: per rispondere a «casting retribuiti vicino a Bologna»
            bisognava fare metà lavoro di là, tenere a mente il risultato e
            rifarlo di qua. Sono due viste sulla stessa domanda, e ora la
            domanda si fa una volta sola. */}
        <div className="card space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <label htmlFor="cerca-mappa" className="sr-only">
              Cerca per titolo o città
            </label>
            <input
              id="cerca-mappa"
              type="search"
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder="Titolo o città…"
              className="input min-h-11 w-full pl-9"
            />
          </div>

          <div>
            <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Tipo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIE.map(([chiave, c]) => {
                const attiva = categoria === chiave;
                return (
                  <button
                    key={chiave}
                    type="button"
                    onClick={() => setCategoria(attiva ? null : chiave)}
                    aria-pressed={attiva}
                    /* `bg-surface-sunken` sullo stato spento: con il solo
                       bordo, su fondo chiaro le pillole sembravano una legenda
                       — un elenco di colori da leggere — invece di cinque cose
                       da premere. Un comando deve avere un corpo, non solo un
                       contorno. */
                    className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-fluid-xs font-medium transition-colors ${
                      attiva
                        ? "border-brand-500 bg-brand-500/15 text-ink"
                        : "border-line bg-surface-sunken text-ink-muted hover:border-brand-400/50 hover:text-ink"
                    }`}
                  >
                    {/* Lo stesso colore del pin: è ciò che lega la pillola a
                        quello che si vede sulla mappa, e senza il legame il
                        colore dei pin resterebbe un enigma. */}
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: TINTA[chiave] ?? TINTA_ALTRO }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex min-h-11 items-center gap-2.5 text-fluid-sm">
            <input
              type="checkbox"
              checked={soloPagati}
              onChange={(e) => setSoloPagati(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            Solo con compenso
          </label>

          <button type="button" className="btn-ghost min-h-11 w-full" disabled={inCorso} onClick={locate}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {inCorso ? "Ti sto cercando…" : "Usa la mia posizione"}
          </button>
          {geoError && (
            <p role="status" className="text-fluid-xs text-ink-muted">
              {geoError}
            </p>
          )}

          {/* Il cursore del raggio compariva prima che ci fosse un centro
              attorno a cui misurare: si poteva regolarlo senza che
              significasse niente. Ora appare insieme al risultato che
              governa. */}
          {filtraPerRaggio && (
            <div>
              <label htmlFor="radius" className="block text-fluid-sm font-medium">
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
                className="mt-2 w-full accent-brand-500"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p role="status" className="text-fluid-sm text-ink-muted">
              {visible.length === 0
                ? "Nessun ingaggio con questi filtri"
                : filtraPerRaggio
                  ? `${conta(visible.length, "ingaggio", "ingaggi")} entro ${radius} km`
                  : `${conta(visible.length, "ingaggio", "ingaggi")} in tutta Italia`}
            </p>
            {filtriAttivi && (
              <button type="button" onClick={azzera} className="btn-ghost min-h-9 text-fluid-xs">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Azzera
              </button>
            )}
          </div>
        </div>

        {/* Filtrare fino a zero è un vicolo cieco se la pagina non dice come
            uscirne: il rimedio va accanto al vuoto, non nella barra sopra. */}
        {visible.length === 0 && filtriAttivi && (
          <div className="card text-fluid-sm text-ink-muted">
            <p>Prova ad allargare: togli il tipo, o alza il raggio.</p>
            <button type="button" onClick={azzera} className="btn-primary mt-4">
              Mostra tutti gli ingaggi
            </button>
          </div>
        )}

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

        {visible.length > 20 && (
          <p className="text-fluid-xs text-ink-faint">
            In elenco i primi 20 di {visible.length}. Sulla mappa ci sono tutti.
          </p>
        )}
      </div>
    </div>
  );
}

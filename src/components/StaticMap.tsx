/**
 * Anteprima mappa senza JavaScript: un iframe OpenStreetMap lazy.
 * Sulle pagine indicizzate evita di caricare Leaflet (~150 kB) e non
 * peggiora LCP/INP; la mappa interattiva vive solo su /mappa.
 */
export function StaticMap({
  latitude,
  longitude,
  label,
  zoomDelta = 0.01,
}: {
  latitude: number;
  longitude: number;
  label: string;
  zoomDelta?: number;
}) {
  const bbox = [
    longitude - zoomDelta,
    latitude - zoomDelta,
    longitude + zoomDelta,
    latitude + zoomDelta,
  ].join("%2C");

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <figure className="card overflow-hidden p-0">
      {/* `mappa-incorporata`: sul tema scuro il riquadro veniva bianco, cioè
          la cosa più vistosa di una pagina scura. Il filtro è lo stesso della
          mappa interattiva e sta nella stessa dichiarazione in globals.css —
          erano due componenti diversi, e la correzione era stata applicata a
          uno solo. */}
      <iframe
        title={`Mappa: ${label}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="mappa-incorporata h-64 w-full border-0"
      />
      <figcaption className="p-3 text-xs muted">
        {label} —{" "}
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
          target="_blank"
          rel="noopener nofollow"
          className="underline"
        >
          apri su OpenStreetMap
        </a>
      </figcaption>
    </figure>
  );
}

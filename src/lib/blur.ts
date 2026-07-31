/**
 * Segnaposto sfocato per next/image.
 *
 * Un SVG minimo codificato in base64, generato a build time: pesa poche
 * decine di byte contro i ~600 di un blurDataURL raster, e non richiede di
 * pre-elaborare le immagini. Serve a occupare lo spazio con qualcosa di
 * gradevole mentre l'immagine vera arriva, evitando il lampo bianco.
 */
export function blurDataUrl(from = "#ede9fe", to = "#ddd6fe"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="8" height="8" fill="url(#g)"/></svg>`;
  const encoded =
    typeof window === "undefined"
      ? Buffer.from(svg).toString("base64")
      : window.btoa(svg);
  return `data:image/svg+xml;base64,${encoded}`;
}

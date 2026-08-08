/**
 * La mappa: dove si può andare, e come si legge quando i punti si accavallano.
 *
 * Sta in un modulo puro — niente Leaflet, niente `window` — per due motivi.
 * Il primo è che si può provare: il raggruppamento è l'unica logica non banale
 * di tutta la pagina, ed è anche quella che sbagliata non dà nessun errore, dà
 * una mappa leggermente sbagliata. Il secondo è che i confini sono un dato del
 * prodotto, non un dettaglio di rendering: il giorno in cui il sito uscirà
 * dall'Italia si cambiano qui.
 */

/**
 * I confini entro cui si può navigare.
 *
 * ── Perché la mappa è chiusa ──
 *
 * Il sito è italiano: ogni annuncio, ogni artista, ogni città del seed. Una
 * mappa che si lascia trascinare fino in Groenlandia offre un unico esito
 * possibile — uno schermo vuoto — e chi ci finisce non sa più tornare
 * indietro se non ricaricando. Non è libertà, è una via senza uscita
 * raggiungibile con due dita.
 *
 * Il rettangolo è largo: comprende Lampedusa a sud (35,49° N), il Brennero a
 * nord, e lascia un margine di mare su entrambi i lati perché una costa
 * incollata al bordo della finestra si guarda male.
 */
export const CONFINI_ITALIA = {
  sud: 35.0,
  ovest: 6.2,
  nord: 47.35,
  est: 19.0,
} as const;

/** Nel formato che Leaflet vuole: `[[sud, ovest], [nord, est]]`. */
export const LIMITI: [[number, number], [number, number]] = [
  [CONFINI_ITALIA.sud, CONFINI_ITALIA.ovest],
  [CONFINI_ITALIA.nord, CONFINI_ITALIA.est],
];

/**
 * Lo zoom minimo, cioè quanto ci si può allontanare.
 *
 * A 5 l'Italia intera sta dentro anche uno schermo da telefono. Più in là si
 * vedrebbe mezza Europa vuota, e la mappa comincerebbe a combattere con
 * `maxBounds` rimbalzando a ogni gesto — un effetto che sembra un difetto
 * anche quando è voluto.
 */
export const ZOOM_MINIMO = 5;

/** Lo zoom d'apertura: tutta l'Italia, senza tagliare le isole. */
export const ZOOM_INIZIALE = 6;

/** Il centro geografico che si usa finché non si conosce quello di chi guarda. */
export const CENTRO_ITALIA = { lat: 42.0, lng: 12.5 } as const;

/**
 * Un punto è dentro i confini?
 *
 * Serve al server: un annuncio geocodificato male — una coordinata invertita,
 * un indirizzo ambiguo finito in Kansas — diventerebbe un pin irraggiungibile
 * dentro una mappa chiusa, e il suo autore vedrebbe «pubblicato» senza che
 * nessuno lo trovi mai. Meglio saperlo qui che scoprirlo dopo.
 */
export function dentroItalia(lat: number, lng: number): boolean {
  return (
    lat >= CONFINI_ITALIA.sud &&
    lat <= CONFINI_ITALIA.nord &&
    lng >= CONFINI_ITALIA.ovest &&
    lng <= CONFINI_ITALIA.est
  );
}

// ─────────────────────────── RAGGRUPPAMENTO ───────────────────────────

/**
 * Quanti gradi di longitudine occupa un pixel a un certo zoom.
 *
 * Nella proiezione Web Mercator il mondo intero è largo 256 pixel a zoom 0 e
 * raddoppia a ogni livello: 360 gradi divisi per quei pixel.
 */
function gradiPerPixel(zoom: number): number {
  return 360 / (256 * Math.pow(2, zoom));
}

export type Puntino = { lat: number; lng: number };

export type Gruppo<T extends Puntino> = {
  /** Il baricentro di ciò che contiene: è lì che va disegnato il simbolo. */
  lat: number;
  lng: number;
  elementi: T[];
};

/**
 * Raggruppa i punti che a questo zoom finirebbero uno sopra l'altro.
 *
 * ── Il problema ──
 *
 * Con l'Italia intera sullo schermo, sei annunci a Milano sono sei pin nello
 * stesso pixel: se ne vede uno, e gli altri cinque non esistono per chi
 * guarda. Peggio: cliccandolo si apre il popup di quello disegnato per ultimo,
 * cioè uno a caso. La mappa non è illeggibile — è **silenziosamente
 * incompleta**, che è peggio, perché nessuno va a cercare quello che non sa
 * di non vedere.
 *
 * ── Perché scritto a mano e non con una libreria ──
 *
 * `leaflet.markercluster` fa questo e molto altro: animazioni di espansione,
 * poligoni convessi attorno ai gruppi, spiderfy quando i punti coincidono. È
 * una dipendenza di un certo peso, non tipizzata nativamente, e con un
 * adattatore React che segue Leaflet con qualche mese di ritardo — su un
 * progetto che ha già dovuto contenere il rischio di una beta.
 *
 * Quello che serve qui sono quaranta righe che si possono leggere, provare e
 * spiegare. Il criterio non è «meno dipendenze è meglio»: è che il costo di
 * capire la libreria supera il costo di scrivere la parte che uso.
 *
 * ── Come funziona ──
 *
 * Una griglia in coordinate schermo. La cella è larga `cellaPx` pixel, che a
 * uno zoom dato corrisponde a un numero di gradi: due punti nella stessa cella
 * sarebbero disegnati a meno di quella distanza l'uno dall'altro, quindi si
 * accavallerebbero. Il gruppo si disegna al **baricentro** dei suoi membri e
 * non al centro della cella, così un gruppo di due punti vicini resta dove
 * sono davvero e non salta al centro di un quadrato invisibile.
 *
 * La griglia è la scelta più economica che risolve il problema vero. Non è un
 * clustering ottimo — due punti vicinissimi a cavallo di un bordo restano
 * separati — ma è stabile: raggruppando per posizione assoluta e non per
 * ordine di scansione, lo stesso zoom dà sempre lo stesso risultato, e la
 * mappa non cambia disposizione quando si sposta di un pixel.
 */
export function raggruppa<T extends Puntino>(
  punti: readonly T[],
  zoom: number,
  cellaPx = 44
): Gruppo<T>[] {
  const passo = gradiPerPixel(zoom) * cellaPx;
  if (!Number.isFinite(passo) || passo <= 0) {
    return punti.map((p) => ({ lat: p.lat, lng: p.lng, elementi: [p] }));
  }

  const celle = new Map<string, T[]>();
  for (const p of punti) {
    // `Math.floor` sulla posizione assoluta: la stessa coordinata cade sempre
    // nella stessa cella, indipendentemente da quali altri punti ci sono.
    const chiave = `${Math.floor(p.lat / passo)}:${Math.floor(p.lng / passo)}`;
    const dentro = celle.get(chiave);
    if (dentro) dentro.push(p);
    else celle.set(chiave, [p]);
  }

  return Array.from(celle.values()).map((elementi) => ({
    lat: elementi.reduce((s, p) => s + p.lat, 0) / elementi.length,
    lng: elementi.reduce((s, p) => s + p.lng, 0) / elementi.length,
    elementi,
  }));
}

/**
 * Il rettangolo che contiene un gruppo, per inquadrarlo al clic.
 *
 * Aprire un gruppo alzando lo zoom di un livello fisso è la soluzione ovvia e
 * quella sbagliata: sei annunci sparsi su Milano e provincia hanno bisogno di
 * due livelli, sei nello stesso isolato di sette. Inquadrando il rettangolo,
 * la mappa arriva sempre alla distanza giusta al primo colpo.
 *
 * Se i punti coincidono davvero — due annunci nello stesso locale — il
 * rettangolo è degenere e chi chiama deve limitarsi ad avvicinarsi di un
 * livello: qui si restituisce comunque, perché è chi ha la mappa a sapere
 * fino a dove può spingersi.
 */
export function riquadroDi<T extends Puntino>(g: Gruppo<T>): [[number, number], [number, number]] {
  const lat = g.elementi.map((p) => p.lat);
  const lng = g.elementi.map((p) => p.lng);
  return [
    [Math.min(...lat), Math.min(...lng)],
    [Math.max(...lat), Math.max(...lng)],
  ];
}

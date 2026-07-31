/**
 * Città seed per la directory locale. Ogni voce genera pagine statiche:
 *   /citta/<slug>                       hub cittadino
 *   /citta/<slug>/artisti               elenco artisti
 *   /citta/<slug>/eventi                ingaggi aperti
 *   /citta/<slug>/artisti/<disciplina>  long tail (es. .../artisti/dj)
 */
export type SeedCity = {
  slug: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  population: number;
};

export const SEED_CITIES: SeedCity[] = [
  { slug: "milano", name: "Milano", region: "Lombardia", lat: 45.4642, lng: 9.19, population: 1371498 },
  { slug: "roma", name: "Roma", region: "Lazio", lat: 41.9028, lng: 12.4964, population: 2761632 },
  { slug: "napoli", name: "Napoli", region: "Campania", lat: 40.8518, lng: 14.2681, population: 913462 },
  { slug: "torino", name: "Torino", region: "Piemonte", lat: 45.0703, lng: 7.6869, population: 848196 },
  { slug: "bologna", name: "Bologna", region: "Emilia-Romagna", lat: 44.4949, lng: 11.3426, population: 392564 },
  { slug: "firenze", name: "Firenze", region: "Toscana", lat: 43.7696, lng: 11.2558, population: 361619 },
  { slug: "palermo", name: "Palermo", region: "Sicilia", lat: 38.1157, lng: 13.3615, population: 630828 },
  { slug: "genova", name: "Genova", region: "Liguria", lat: 44.4056, lng: 8.9463, population: 561870 },
  { slug: "bari", name: "Bari", region: "Puglia", lat: 41.1171, lng: 16.8719, population: 320475 },
  { slug: "catania", name: "Catania", region: "Sicilia", lat: 37.5079, lng: 15.083, population: 298762 },
  { slug: "verona", name: "Verona", region: "Veneto", lat: 45.4384, lng: 10.9916, population: 257275 },
  { slug: "venezia", name: "Venezia", region: "Veneto", lat: 45.4408, lng: 12.3155, population: 258685 },
  { slug: "padova", name: "Padova", region: "Veneto", lat: 45.4064, lng: 11.8768, population: 210401 },
  { slug: "trieste", name: "Trieste", region: "Friuli-Venezia Giulia", lat: 45.6495, lng: 13.7768, population: 204338 },
  { slug: "brescia", name: "Brescia", region: "Lombardia", lat: 45.5416, lng: 10.2118, population: 196745 },
  { slug: "cagliari", name: "Cagliari", region: "Sardegna", lat: 39.2238, lng: 9.1217, population: 154106 },
  { slug: "perugia", name: "Perugia", region: "Umbria", lat: 43.1107, lng: 12.3908, population: 165683 },
  { slug: "rimini", name: "Rimini", region: "Emilia-Romagna", lat: 44.0678, lng: 12.5695, population: 150951 },
  { slug: "bergamo", name: "Bergamo", region: "Lombardia", lat: 45.6983, lng: 9.6773, population: 120287 },
  { slug: "salerno", name: "Salerno", region: "Campania", lat: 40.6824, lng: 14.7681, population: 130940 },
];

/**
 * Testo introduttivo per città: evita che 20 landing condividano lo stesso
 * contenuto, cosa che Google tratta come thin/duplicate content.
 */
export function cityIntro(c: SeedCity): string {
  return (
    `${c.name} è uno dei poli creativi della ${c.region}: locali, festival, teatri e ` +
    `spazi indipendenti cercano artisti tutto l'anno. Su Vybes trovi i profili di ` +
    `musicisti, DJ, band, ballerini e performer attivi a ${c.name} e provincia, insieme ` +
    `agli ingaggi aperti pubblicati da organizzatori e locali della zona. Filtra per ` +
    `disciplina, guarda i portfolio e candidati direttamente, senza intermediazioni.`
  );
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

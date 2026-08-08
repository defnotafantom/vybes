export const SITE = {
  name: "Vybes",
  legalName: "Vybes",
  tagline: "La rete che connette artisti e chi li ingaggia",
  description:
    "Vybes e' la piattaforma italiana dove artisti, musicisti e performer costruiscono il proprio portfolio e trovano ingaggi. Locali, agenzie e organizzatori pubblicano eventi e casting.",
  locale: "it_IT",
  twitter: "@vybes",
} as const;

/** URL canonico del sito, senza slash finale. */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export const ROLES = { ARTIST: "ARTIST", RECRUITER: "RECRUITER", ADMIN: "ADMIN" } as const;
export type Role = keyof typeof ROLES;

export const EVENT_CATEGORIES = {
  LIVE: { label: "Concerto / Live", plural: "Concerti", slug: "concerti" },
  CASTING: { label: "Casting", plural: "Casting", slug: "casting" },
  WORKSHOP: { label: "Workshop", plural: "Workshop", slug: "workshop" },
  CONTEST: { label: "Contest", plural: "Contest", slug: "contest" },
  JAM: { label: "Jam session", plural: "Jam session", slug: "jam-session" },
} as const;
export type EventCategory = keyof typeof EVENT_CATEGORIES;

export const DISCIPLINES = [
  { slug: "cantanti", label: "Cantante", plural: "Cantanti" },
  { slug: "musicisti", label: "Musicista", plural: "Musicisti" },
  { slug: "dj", label: "DJ", plural: "DJ" },
  { slug: "band", label: "Band", plural: "Band" },
  { slug: "ballerini", label: "Ballerino/a", plural: "Ballerini" },
  { slug: "attori", label: "Attore/Attrice", plural: "Attori" },
  { slug: "fotografi", label: "Fotografo/a", plural: "Fotografi" },
  { slug: "videomaker", label: "Videomaker", plural: "Videomaker" },
  { slug: "illustratori", label: "Illustratore/trice", plural: "Illustratori" },
  { slug: "comici", label: "Comico/a", plural: "Comici" },
] as const;

export type DisciplineSlug = (typeof DISCIPLINES)[number]["slug"];

export function disciplineBySlug(slug: string) {
  return DISCIPLINES.find((d) => d.slug === slug);
}

export const PARTICIPATION_STATUS = {
  PENDING: "In attesa",
  ACCEPTED: "Confermata",
  REJECTED: "Rifiutata",
  CANCELLED: "Annullata",
} as const;

/**
 * Quanti URL al massimo in un file di sitemap.
 *
 * Il limite di Google è 50.000; si sta sotto con un margine, perché una
 * sitemap che lo supera non viene troncata: viene **scartata intera**, e con
 * lei tutte le pagine che conteneva.
 *
 * ── Perché questa costante era una bugia ──
 *
 * Diceva 5.000, e le tre sitemap generate scrivevano `take: 45000` a mano.
 * Nessuna delle due cifre governava l'altra: la costante non la leggeva
 * nessuno, e i tre `45000` erano tre copie da tenere allineate a mente. Al
 * primo che qualcuno avesse alzato a 60.000 per fretta, quella sitemap
 * sarebbe sparita dall'indice in silenzio — e la costante avrebbe continuato
 * a dire 5.000 a chi fosse andato a controllare.
 */
export const SITEMAP_MAX_URL = 45_000;

/**
 * Quanti elementi deve avere una pagina di elenco per meritare di stare in
 * sitemap ed essere indicizzabile.
 *
 * Una directory locale genera per costruzione centinaia di combinazioni
 * città×disciplina, e all'inizio quasi tutte sono vuote. Pagine senza
 * contenuto ("nessun artista trovato") vengono classificate come thin
 * content: non posizionano e, in quantità, abbassano la valutazione del
 * dominio e la frequenza di scansione delle pagine buone.
 *
 * Alzalo (3-5) se il sito cresce e vuoi essere più selettivo.
 */
export const MIN_ITEMS_FOR_INDEX = 1;

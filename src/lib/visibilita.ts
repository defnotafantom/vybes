/**
 * Chi compare in pubblico.
 *
 * La regola era scritta in quindici punti diversi, e in quattordici era
 * incompleta. La sitemap richiedeva l'email verificata; gli elenchi — /artisti,
 * le pagine di città, la ricerca, la landing — no. Il risultato: chi si
 * registrava con un indirizzo qualsiasi e non lo confermava mai compariva
 * comunque nella directory pubblica, pur restando fuori dalla sitemap.
 *
 * Finché le registrazioni erano di fatto chiuse era un'incoerenza. Con le
 * registrazioni aperte e una directory indicizzata diventa un richiamo per lo
 * spam: creare profili costa un indirizzo usa e getta, e il guadagno è un link
 * su un dominio reale.
 *
 * La verifica dell'email non ferma un attaccante determinato — gli indirizzi
 * temporanei esistono — ma alza il costo di ogni singolo profilo e ferma
 * l'automazione più banale, che è la maggior parte del problema. È la prima
 * barriera, non l'unica.
 *
 * Da qui in avanti la regola sta in un posto solo. Cambiarla significa
 * cambiarla ovunque.
 */

/**
 * Un profilo compare negli elenchi pubblici solo se è dichiarato pubblico dal
 * suo proprietario **e** l'indirizzo email è stato confermato.
 *
 * Va composto con gli altri filtri, non usato da solo:
 *
 *     where: { ...PROFILO_PUBBLICO, citySlug: "milano" }
 */
export const PROFILO_PUBBLICO = {
  isPublic: true,
  emailVerified: { not: null },
} as const;

/** Come sopra, ristretto agli artisti. */
export const ARTISTA_PUBBLICO = {
  ...PROFILO_PUBBLICO,
  role: "ARTIST",
} as const;

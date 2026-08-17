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

/**
 * Come sopra, ristretto a chi si fa trovare.
 *
 * `in` e non uguaglianza, da quando esiste il terzo ruolo: chi fa entrambe le
 * cose ha un portfolio come chiunque altro e deve comparire negli elenchi. Con
 * `role: "ARTIST"` sarebbe stato escluso dalla directory, dalla vetrina, dalla
 * sitemap e dalla rotazione del gioco — invisibile ovunque, senza nessun
 * errore da nessuna parte.
 *
 * È anche la ragione per cui il terzo ruolo è un valore e non una lista
 * separata da virgole: questo filtro corre su un indice composto, ed è la
 * query più calda del sito. `in` lo usa, una ricerca per sottostringa no.
 * Vedi `src/lib/ruolo.ts`.
 */
export const ARTISTA_PUBBLICO = {
  ...PROFILO_PUBBLICO,
  // Senza `as const` di proposito: Prisma vuole un array modificabile per
  // `in`, e un `readonly` qui fa fallire ogni chiamata con un errore di tipo
  // che parla di varianza invece che di ruoli.
  role: { in: ["ARTIST", "ENTRAMBI"] },
};

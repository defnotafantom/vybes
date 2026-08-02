import { NextResponse, type NextRequest } from "next/server";

/**
 * Protegge l'area privata e normalizza gli URL.
 *
 * Il controllo è sulla sola presenza del cookie di sessione: la verifica
 * crittografica avviene comunque lato server nelle pagine e nelle API, qui
 * serve a evitare un viaggio inutile al server per chi non è autenticato.
 * Il middleware gira sul runtime edge, dove non c'è modo di verificare la
 * firma senza appesantire ogni richiesta.
 */

/**
 * I nomi base del cookie di sessione. `__Secure-` è il prefisso che Auth.js
 * usa su HTTPS: il browser rifiuta di accettare un cookie con quel prefisso su
 * connessione non cifrata, ed è per questo che in sviluppo il nome è nudo.
 */
const COOKIE_SESSIONE = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * Il cookie di sessione può essere spezzato in più parti.
 *
 * Quando il token supera i quattromila byte — il limite che i browser
 * impongono a un singolo cookie — Auth.js lo divide in `...session-token.0`,
 * `.1`, e così via. Cercare il nome esatto in quel caso non trova niente, e il
 * middleware conclude che l'utente non è autenticato: viene rimandato al login
 * pur avendo una sessione valida.
 *
 * È esattamente il sintomo di una sessione che «scade» senza motivo, e non
 * scade affatto. Succede in modo intermittente perché la dimensione del token
 * dipende da cosa contiene — un'immagine di profilo di Google ha un URL lungo,
 * un nome lungo pesa, e si passa la soglia senza accorgersene.
 *
 * La funzione prende i nomi dei cookie invece della richiesta perché così è
 * verificabile senza costruire un oggetto di Next: è il punto in cui il
 * difetto viveva, e merita un test suo.
 */
export function haSessione(nomiCookie: string[]): boolean {
  return nomiCookie.some((nome) =>
    COOKIE_SESSIONE.some((base) => nome === base || nome.startsWith(`${base}.`))
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search, origin } = req.nextUrl;

  // Canonicalizzazione: niente slash finale, tranne la root.
  //
  // Le rotte API restano fuori: un 308 su una POST costringe il client a
  // rifare la richiesta, e non tutti i client rimandano il corpo. Meglio
  // lasciare che una chiamata con lo slash di troppo fallisca in modo
  // evidente piuttosto che silenziosamente a metà.
  if (pathname.length > 1 && pathname.endsWith("/") && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL(pathname.slice(0, -1) + search, origin), 308);
  }

  const nomiCookie = req.cookies.getAll().map((c) => c.name);

  if (pathname.startsWith("/dashboard") && !haSessione(nomiCookie)) {
    const url = new URL("/accedi", origin);
    // Con la query, non solo il percorso. È il difetto che rompeva l'azione
    // più importante del sito: chi non è autenticato clicca «Contatta» su un
    // profilo, arriva a /dashboard/messaggi/nuovo?a=nome-artista, viene
    // mandato al login, e dopo l'accesso torna su /dashboard/messaggi/nuovo
    // senza più sapere chi voleva contattare — quindi finisce nell'elenco
    // vuoto dei messaggi. Un utente nuovo lo legge come «non funziona».
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Esclude asset statici, immagini generate e file di SEO.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.*\\.xml|manifest.webmanifest|uploads).*)",
  ],
};

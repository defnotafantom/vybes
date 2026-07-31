import { NextResponse, type NextRequest } from "next/server";

/**
 * Protegge l'area privata e normalizza gli URL.
 * Il controllo è sulla presenza del cookie di sessione: la verifica
 * crittografica avviene comunque lato server nelle pagine e nelle API,
 * qui serve solo a evitare un round trip inutile.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function middleware(req: NextRequest) {
  const { pathname, search, origin } = req.nextUrl;

  // Canonicalizzazione: niente slash finale (tranne la root).
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return NextResponse.redirect(new URL(pathname.slice(0, -1) + search, origin), 308);
  }

  if (pathname.startsWith("/dashboard")) {
    const hasSession = SESSION_COOKIES.some((c) => req.cookies.has(c));
    if (!hasSession) {
      const url = new URL("/accedi", origin);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Esclude asset statici, immagini generate e file di SEO.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.*\\.xml|manifest.webmanifest|uploads).*)",
  ],
};

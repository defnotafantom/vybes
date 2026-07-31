import type { Metadata } from "next";
import { SITE, siteUrl } from "@/lib/constants";

/**
 * Lingue effettivamente pubblicate. La lingua di default non ha prefisso
 * nell'URL; le altre vivono sotto /<lang>/...
 *
 * IMPORTANTE: aggiungere "en" qui SOLO dopo aver creato le rotte /en/*.
 * Un hreflang che punta a un 404 e' un errore che Google segnala in Search
 * Console e che annulla il beneficio dell'annotazione. Una volta pronte le
 * pagine inglesi basta cambiare questa riga: metadata e sitemap si
 * aggiornano da soli.
 */
export const LOCALES = ["it"] as const satisfies readonly ("it" | "en")[];
export const DEFAULT_LOCALE = "it";
export type Locale = "it" | "en";

/** Percorso assoluto per una lingua data. */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return locale === DEFAULT_LOCALE ? clean : `/${locale}${clean === "/" ? "" : clean}`;
}

/** Mappa hreflang -> URL assoluto, piu' x-default. */
export function alternateLanguages(path: string): Record<string, string> {
  const base = siteUrl();
  const map: Record<string, string> = {};
  for (const locale of LOCALES) {
    const tag = locale === "it" ? "it-IT" : "en";
    map[tag] = `${base}${localizedPath(path, locale)}`;
  }
  map["x-default"] = `${base}${localizedPath(path, DEFAULT_LOCALE)}`;
  return map;
}

export function absoluteUrl(path = "/"): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Taglia una descrizione al limite utile per lo snippet di ricerca
 * (~155 caratteri) senza spezzare le parole.
 */
export function metaDescription(
  input: string | null | undefined,
  fallback: string = SITE.description
): string {
  const text = (input ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (text.length <= 155) return text;
  return `${text.slice(0, 152).replace(/\s+\S*$/, "")}...`;
}

type BuildMetaInput = {
  title: string;
  description?: string | null;
  /** Percorso relativo, es. "/artisti/mario-rossi". Serve per canonical e hreflang. */
  path: string;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  type?: "website" | "article" | "profile";
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  /** true per pagine che non devono finire nell'indice (filtri, paginazione profonda). */
  noindex?: boolean;
  keywords?: string[];
};

/**
 * Costruttore unico dei metadata: garantisce che ogni pagina abbia
 * canonical, hreflang, Open Graph e Twitter card coerenti.
 */
export function buildMetadata({
  title,
  description,
  path,
  images,
  type = "website",
  publishedTime,
  modifiedTime,
  noindex = false,
  keywords,
}: BuildMetaInput): Metadata {
  const url = absoluteUrl(localizedPath(path, DEFAULT_LOCALE));
  const desc = metaDescription(description);
  // Senza immagine esplicita si usa quella di default: una pagina condivisa
  // senza anteprima ha un CTR sensibilmente peggiore sui social.
  const source = images?.length
    ? images
    : [{ url: "/og-default.png", width: 1200, height: 630, alt: SITE.name }];

  const ogImages = source.map((i) => ({
    url: i.url.startsWith("http") ? i.url : absoluteUrl(i.url),
    width: i.width ?? 1200,
    height: i.height ?? 630,
    alt: i.alt ?? title,
  }));

  return {
    title,
    description: desc,
    keywords,
    alternates: {
      canonical: url,
      languages: alternateLanguages(path),
    },
    robots: noindex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      url,
      title,
      description: desc,
      siteName: SITE.name,
      locale: SITE.locale,
      images: ogImages,
      ...(type === "article"
        ? {
            publishedTime: publishedTime ? new Date(publishedTime).toISOString() : undefined,
            modifiedTime: modifiedTime ? new Date(modifiedTime).toISOString() : undefined,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      site: SITE.twitter,
      images: ogImages?.map((i) => i.url),
    },
  };
}

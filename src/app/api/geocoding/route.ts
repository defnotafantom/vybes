import { guard, ok, fail, handle } from "@/lib/api";
import { SITE, siteUrl } from "@/lib/constants";

export const dynamic = "force-dynamic";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
};

export type GeocodeResult = {
  label: string;
  latitude: number;
  longitude: number;
  city: string;
  postcode: string;
  street: string;
};

/**
 * Cache in memoria delle risposte.
 *
 * Le policy d'uso di Nominatim chiedono massimo una richiesta al secondo e di
 * non ripetere query identiche. Un autocomplete senza cache le viola in fretta,
 * e il risultato è un blocco dell'IP. Con questa, digitare "via roma mil" tre
 * volte costa una sola chiamata.
 */
const cache = new Map<string, { at: number; data: GeocodeResult[] }>();
const CACHE_TTL = 60 * 60 * 1000;
const CACHE_MAX = 500;

/** Nominatim vuole al massimo 1 req/s: si serializzano le chiamate. */
let lastCall = 0;
async function throttle() {
  const wait = Math.max(0, 1100 - (Date.now() - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export async function GET(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "geocoding", limit: 30 });
    if (g.error) return g.error;

    const query = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (query.length < 3) return ok({ results: [] as GeocodeResult[] });

    const key = query.toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      return ok({ results: hit.data, cached: true });
    }

    await throttle();

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        format: "json",
        q: query,
        limit: "6",
        addressdetails: "1",
        countrycodes: "it",
        "accept-language": "it",
      });

    const res = await fetch(url, {
      // Nominatim rifiuta le richieste senza User-Agent identificabile.
      headers: { "User-Agent": `${SITE.name}/1.0 (${siteUrl()})` },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return fail("Servizio di ricerca indirizzi non disponibile", 502);

    const raw = (await res.json()) as NominatimResult[];
    const results: GeocodeResult[] = raw.map((item) => {
      const a = item.address ?? {};
      return {
        label: item.display_name,
        latitude: Number.parseFloat(item.lat),
        longitude: Number.parseFloat(item.lon),
        city: a.city || a.town || a.village || a.municipality || "",
        postcode: a.postcode || "",
        street: [a.road, a.house_number].filter(Boolean).join(" "),
      };
    });

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, { at: Date.now(), data: results });

    return ok({ results, cached: false });
  });
}

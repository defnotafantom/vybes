import slugify from "slugify";

export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, locale: "it", trim: true });
}

/**
 * Genera uno slug unico interrogando il DB tramite il predicato passato.
 * Evita collisioni aggiungendo un suffisso numerico progressivo.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
  maxLength = Infinity
): Promise<string> {
  const root = (toSlug(base) || "vybes").slice(0, maxLength).replace(/-+$/, "");
  let candidate = root;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    const suffix = `-${n}`;
    candidate = `${root.slice(0, maxLength - suffix.length).replace(/-+$/, "")}${suffix}`;
  }
  return candidate;
}

/** Proposta compatibile con i limiti del nickname pubblico. */
export function profileSlugBase(name: string): string {
  const slug = toSlug(name).slice(0, 30).replace(/-+$/, "");
  return slug.length >= 3 ? slug : `${slug || "utente"}-vybes`;
}

/** Separa una stringa "a,b,c" in array pulito (workaround array su sqlite). */
export function fromCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toCsv(values: string[]): string {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).join(",");
}

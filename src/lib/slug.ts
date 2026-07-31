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
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = toSlug(base) || "vybes";
  let candidate = root;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

/** Separa una stringa "a,b,c" in array pulito (workaround array su sqlite). */
export function fromCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function toCsv(values: string[]): string {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).join(",");
}

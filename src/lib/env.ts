import { z } from "zod";

/**
 * Validazione delle variabili d'ambiente.
 *
 * Il valore di questo file sta nel fallire subito e con un messaggio chiaro.
 * Senza, una variabile dimenticata non dà errore: dà comportamenti sbagliati
 * silenziosi. NEXT_PUBLIC_SITE_URL assente, per esempio, fa generare canonical
 * e sitemap che puntano al dominio del deployment invece che a quello vero, e
 * te ne accorgi settimane dopo guardando Search Console.
 */
const schema = z.object({
  // ---- Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL è obbligatoria (connessione pooled Neon)"),
  DIRECT_URL: z
    .string()
    .min(1)
    .optional()
    .describe("Connessione diretta, richiesta da prisma migrate"),

  // ---- Auth.js v5
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET troppo corta: usa `openssl rand -base64 32`"),
  AUTH_TRUST_HOST: z.string().optional(),

  // ---- SEO
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL deve essere un URL completo, es. https://vybeshub.art")
    .optional(),

  // ---- Storage
  UPLOAD_DRIVER: z.enum(["vercel-blob", "local"]).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // ---- Redis (facoltativo: senza, il rate limit vale per istanza)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ---- Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // ---- OAuth (facoltativo)
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // ---- Ambiente
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SITE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

/** Controlli che dipendono dalla combinazione di più variabili. */
function crossChecks(env: Env): string[] {
  const problems: string[] = [];
  const isProd = env.SITE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (isProd && !env.NEXT_PUBLIC_SITE_URL) {
    problems.push(
      "NEXT_PUBLIC_SITE_URL manca in produzione: canonical, sitemap e Open Graph " +
        "punterebbero all'URL del deployment invece che al dominio."
    );
  }
  if (env.NEXT_PUBLIC_SITE_URL?.endsWith("/")) {
    problems.push("NEXT_PUBLIC_SITE_URL non deve finire con /");
  }
  if (env.UPLOAD_DRIVER === "vercel-blob" && !env.BLOB_READ_WRITE_TOKEN) {
    problems.push("UPLOAD_DRIVER=vercel-blob ma BLOB_READ_WRITE_TOKEN non è impostato");
  }
  if (process.env.VERCEL && env.UPLOAD_DRIVER === "local") {
    problems.push(
      "UPLOAD_DRIVER=local su Vercel: il filesystem è effimero e i file caricati " +
        "spariranno al prossimo deploy."
    );
  }
  if (env.RESEND_API_KEY && !env.EMAIL_FROM) {
    problems.push("RESEND_API_KEY è impostata ma manca EMAIL_FROM (es. \"Vybes <no-reply@dominio>\")");
  }
  if (Boolean(env.UPSTASH_REDIS_REST_URL) !== Boolean(env.UPSTASH_REDIS_REST_TOKEN)) {
    problems.push("UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN vanno impostate entrambe o nessuna");
  }
  if (Boolean(env.AUTH_GOOGLE_ID) !== Boolean(env.AUTH_GOOGLE_SECRET)) {
    problems.push("AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET vanno impostate entrambe o nessuna");
  }
  return problems;
}

let cache: Env | null = null;

/**
 * Valida e restituisce l'ambiente. In produzione un errore blocca l'avvio;
 * in sviluppo stampa l'elenco dei problemi e prosegue, per non impedire di
 * lavorare su una parte del progetto mentre un'altra non è configurata.
 */
export function getEnv(): Env {
  if (cache) return cache;

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const lines = parsed.error.errors.map((e) => `  · ${e.path.join(".")}: ${e.message}`);
    const message = `Variabili d'ambiente non valide:\n${lines.join("\n")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`\n⚠ ${message}\n`);
    cache = schema.partial().parse(process.env) as Env;
    return cache;
  }

  const warnings = crossChecks(parsed.data);
  if (warnings.length > 0) {
    const message = `Configurazione incoerente:\n${warnings.map((w) => `  · ${w}`).join("\n")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`\n⚠ ${message}\n`);
  }

  cache = parsed.data;
  return cache;
}

/** Diagnostica leggibile, usata da /api/health. */
export function envReport() {
  const parsed = schema.safeParse(process.env);
  return {
    valid: parsed.success,
    errors: parsed.success ? [] : parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
    warnings: parsed.success ? crossChecks(parsed.data) : [],
    features: {
      email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      googleOAuth: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      blobStorage: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      distributedRateLimit: Boolean(
        process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ),
      canonicalUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    },
  };
}

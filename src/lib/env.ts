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
  SIGHTENGINE_USER: z.string().optional(),
  SIGHTENGINE_SECRET: z.string().optional(),
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

/**
 * Controlli che dipendono dalla combinazione di più variabili.
 *
 * La distinzione fra `fatal` e `warnings` è la parte importante: si blocca
 * l'avvio SOLO quando l'applicazione produrrebbe un comportamento sbagliato
 * in silenzio. Se manca il token dello storage gli upload falliscono con un
 * errore visibile e il resto del sito funziona: spegnere tutto sarebbe una
 * cura peggiore del male.
 */
function crossChecks(env: Env): { fatal: string[]; warnings: string[] } {
  const fatal: string[] = [];
  const warnings: string[] = [];
  const isProduction =
    env.SITE_ENV === "production" || process.env.VERCEL_ENV === "production";

  // FATALE: senza, canonical e sitemap puntano all'URL del deployment e
  // Google indicizza il dominio sbagliato. Nessun errore visibile, danno
  // permanente: è il caso che questa validazione esiste per prevenire.
  if (isProduction && !env.NEXT_PUBLIC_SITE_URL) {
    fatal.push(
      "NEXT_PUBLIC_SITE_URL manca in produzione: canonical, sitemap e Open Graph " +
        "punterebbero all'URL del deployment invece che al dominio."
    );
  }

  // FATALE: lo spegnimento del limitatore esiste per la suite end-to-end, che
  // fa una dozzina di registrazioni al minuto dallo stesso indirizzo. In
  // produzione toglierebbe la prima difesa contro la creazione automatica di
  // account su un sito con le registrazioni aperte — e lo farebbe in silenzio,
  // perché un limitatore spento non produce nessun errore: produce traffico
  // che passa. Una scorciatoia che si può attivare per sbaglio sull'ambiente
  // sbagliato non è una scorciatoia, è una vulnerabilità con un nome
  // amichevole. `rate-limit.ts` la ignora comunque quando NODE_ENV è
  // production; questo controllo impedisce di arrivarci con quell'idea.
  if (isProduction && process.env.RATE_LIMIT_DISABILITATO === "1") {
    fatal.push(
      "RATE_LIMIT_DISABILITATO=1 in produzione: serve solo ai test end-to-end, " +
        "e qui toglierebbe la difesa contro la creazione automatica di account."
    );
  }

  if (env.NEXT_PUBLIC_SITE_URL?.endsWith("/")) {
    warnings.push("NEXT_PUBLIC_SITE_URL non deve finire con /");
  }
  if (env.UPLOAD_DRIVER === "vercel-blob" && !env.BLOB_READ_WRITE_TOKEN) {
    warnings.push(
      "UPLOAD_DRIVER=vercel-blob ma BLOB_READ_WRITE_TOKEN non è impostato: " +
        "gli upload falliranno finché non colleghi il Blob store."
    );
  }
  if (process.env.VERCEL && env.UPLOAD_DRIVER === "local") {
    warnings.push(
      "UPLOAD_DRIVER=local su Vercel: il filesystem è effimero e i file caricati " +
        "spariranno al prossimo deploy."
    );
  }
  if (env.RESEND_API_KEY && !env.EMAIL_FROM) {
    warnings.push('RESEND_API_KEY è impostata ma manca EMAIL_FROM (es. "Vybes <no-reply@dominio>")');
  }
  if (Boolean(env.SIGHTENGINE_USER) !== Boolean(env.SIGHTENGINE_SECRET)) {
    warnings.push("SIGHTENGINE_USER e SIGHTENGINE_SECRET vanno impostate entrambe o nessuna");
  }
  if (Boolean(env.UPSTASH_REDIS_REST_URL) !== Boolean(env.UPSTASH_REDIS_REST_TOKEN)) {
    warnings.push("UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN vanno impostate entrambe o nessuna");
  }
  if (Boolean(env.AUTH_GOOGLE_ID) !== Boolean(env.AUTH_GOOGLE_SECRET)) {
    warnings.push("AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET vanno impostate entrambe o nessuna");
  }

  return { fatal, warnings };
}

let cache: Env | null = null;

/**
 * Valida e restituisce l'ambiente. In produzione un problema fatale blocca
 * l'avvio; in sviluppo stampa l'elenco e prosegue, per non impedire di
 * lavorare su una parte del progetto mentre un'altra non è configurata.
 */
export function getEnv(): Env {
  if (cache) return cache;

  const parsed = schema.safeParse(process.env);

  // Una variabile obbligatoria mancante o malformata è sempre fatale in
  // produzione: senza DATABASE_URL o AUTH_SECRET l'applicazione non può
  // funzionare, e fallire all'avvio è meglio che fallire a ogni richiesta.
  if (!parsed.success) {
    const lines = parsed.error.errors.map((e) => `  · ${e.path.join(".")}: ${e.message}`);
    const message = `Variabili d'ambiente non valide:\n${lines.join("\n")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`\n⚠ ${message}\n`);
    cache = schema.partial().parse(process.env) as Env;
    return cache;
  }

  const { fatal, warnings } = crossChecks(parsed.data);

  if (fatal.length > 0) {
    const message = `Configurazione non utilizzabile:\n${fatal.map((w) => `  · ${w}`).join("\n")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`\n⚠ ${message}\n`);
  }

  if (warnings.length > 0) {
    // Non bloccano: segnalano funzionalità degradate, non un sito inutilizzabile.
    console.warn(`\n⚠ Configurazione incompleta:\n${warnings.map((w) => `  · ${w}`).join("\n")}\n`);
  }

  cache = parsed.data;
  return cache;
}

/** Diagnostica leggibile, usata da /api/health. */
export function envReport() {
  const parsed = schema.safeParse(process.env);
  const checks = parsed.success ? crossChecks(parsed.data) : { fatal: [], warnings: [] };
  return {
    valid: parsed.success && checks.fatal.length === 0,
    errors: parsed.success ? [] : parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
    fatal: checks.fatal,
    warnings: checks.warnings,
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
import * as Sentry from "@sentry/nextjs";

/**
 * Punto di ingresso eseguito da Next una volta sola all'avvio del server,
 * prima di servire qualsiasi richiesta.
 *
 * Fa due cose, in quest'ordine: valida la configurazione e inizializza il
 * monitoraggio. L'ordine conta — se la configurazione è irrecuperabile il
 * processo deve fermarsi comunque, e non ha senso far partire Sentry per
 * segnalare un errore che stiamo già lanciando noi.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/lib/env");
    getEnv();

    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/**
 * Cattura gli errori dei Server Component, che altrimenti non passerebbero
 * da nessun handler visibile: fallirebbero in silenzio.
 */
export const onRequestError = Sentry.captureRequestError;
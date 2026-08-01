
/**
 * Punto di ingresso eseguito da Next una volta sola all'avvio del server,
 * prima di servire qualsiasi richiesta.
 *
 * È il posto giusto per validare la configurazione: se manca qualcosa di
 * essenziale è meglio che il processo non parta affatto, invece di rispondere
 * a migliaia di richieste producendo risultati sbagliati in silenzio.
 */
export async function register() {
  // Gira solo nel runtime Node: nell'edge metà delle variabili non esiste.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getEnv } = await import("@/lib/env");
  getEnv();
}
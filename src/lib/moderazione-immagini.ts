/**
 * Filtro automatico sui file caricati.
 *
 * ── Il problema ──
 *
 * Con le registrazioni aperte a chiunque, un account nuovo può caricare fino a
 * quindici megabyte di qualunque cosa, e il file finisce su un dominio
 * indicizzato con un URL pubblico. Il Digital Services Act è coperto sul lato
 * **reattivo** — chiunque può segnalare, c'è una coda di moderazione, ogni
 * decisione ha una motivazione — ma quello reattivo interviene *dopo*: il
 * contenuto è già online, e su un dominio giovane basta poco per rovinarne la
 * reputazione.
 *
 * ── La scelta: degradare, non bloccare ──
 *
 * Se il servizio di classificazione non è configurato, i caricamenti passano.
 * È la stessa regola del rate limiter (ADR-011): un componente accessorio che
 * non risponde non deve rendere inutilizzabile il prodotto. La differenza è
 * che qui la mancanza non è silenziosa — `/api/health` la espone, e chi apre
 * le registrazioni senza averlo configurato lo sa.
 *
 * Se invece è configurato e la chiamata **fallisce**, il file passa lo stesso.
 * Sembra la scelta debole, ed è deliberata: un servizio esterno che va giù
 * bloccherebbe ogni caricamento del sito, cioè trasformerebbe un disservizio
 * di terzi in un guasto nostro. Il contenuto resta comunque segnalabile.
 *
 * ── Perché una soglia sola, e alta ──
 *
 * I classificatori restituiscono probabilità, non verdetti. Una soglia bassa
 * blocca fotografie di danza contemporanea, che su questa piattaforma sono
 * contenuto legittimo e frequente; una alta lascia passare i casi ambigui, che
 * però restano segnalabili da chiunque. Fra i due errori, su un sito di
 * artisti, il primo è più costoso: bloccare il lavoro di qualcuno che ha
 * appena accettato di iscriversi è il modo più rapido di perderlo.
 *
 * ── Cosa non fa ──
 *
 * Non guarda video né audio: costano molto di più da analizzare e sono una
 * frazione dei caricamenti. Non riconosce il diritto d'autore, che è un
 * problema diverso e non automatizzabile a questo livello. Non sostituisce la
 * moderazione umana: alza la soglia d'ingresso, e basta.
 */

/** Punteggi oltre i quali un'immagine non viene pubblicata. */
const SOGLIE = {
  /** Attività sessuale esplicita: nessuna ambiguità, nessuna tolleranza. */
  sessuale: 0.5,
  /** Violenza esplicita e contenuti cruenti. */
  violenza: 0.6,
  /** Simboli e gesti d'odio. */
  odio: 0.6,
} as const;

export type EsitoModerazione =
  | { ammesso: true }
  | { ammesso: false; motivo: string };

export function moderazioneImmaginiConfigurata(): boolean {
  return Boolean(process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET);
}

/**
 * Classifica un'immagine e decide se può essere pubblicata.
 *
 * Il buffer viene inviato al servizio, non l'URL: al momento della verifica il
 * file non è ancora stato salvato da nessuna parte, ed è proprio il punto —
 * un contenuto respinto non deve mai esistere a un indirizzo pubblico,
 * nemmeno per i pochi secondi che servirebbero a controllarlo dopo.
 */
export async function moderaImmagine(
  buffer: Buffer,
  contentType: string
): Promise<EsitoModerazione> {
  if (!moderazioneImmaginiConfigurata()) return { ammesso: true };
  if (!contentType.startsWith("image/")) return { ammesso: true };

  try {
    const form = new FormData();
    form.append("media", new Blob([new Uint8Array(buffer)], { type: contentType }));
    form.append("models", "nudity-2.1,gore-2.0,offensive-2.0");
    form.append("api_user", process.env.SIGHTENGINE_USER!);
    form.append("api_secret", process.env.SIGHTENGINE_SECRET!);

    // Oltre questo tempo si passa oltre: un caricamento che resta appeso è
    // peggio di un'immagine da moderare a mano.
    const risposta = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000),
    });

    if (!risposta.ok) return { ammesso: true };

    // Parsing difensivo: la forma della risposta appartiene a un servizio
    // esterno e può cambiare senza preavviso. Un campo mancante deve valere
    // «non lo so», che qui significa lasciar passare — non «zero», che
    // significherebbe la stessa cosa ma per caso.
    const dati = (await risposta.json()) as Record<string, unknown>;
    const n = (percorso: string[]): number => {
      let corrente: unknown = dati;
      for (const chiave of percorso) {
        if (typeof corrente !== "object" || corrente === null) return 0;
        corrente = (corrente as Record<string, unknown>)[chiave];
      }
      return typeof corrente === "number" ? corrente : 0;
    };

    const sessuale = Math.max(
      n(["nudity", "sexual_activity"]),
      n(["nudity", "sexual_display"]),
      n(["nudity", "very_suggestive"])
    );
    if (sessuale >= SOGLIE.sessuale) {
      return { ammesso: false, motivo: "contenuto sessualmente esplicito" };
    }

    if (n(["gore", "prob"]) >= SOGLIE.violenza) {
      return { ammesso: false, motivo: "contenuto violento o cruento" };
    }

    if (n(["offensive", "prob"]) >= SOGLIE.odio) {
      return { ammesso: false, motivo: "simboli o gesti d'odio" };
    }

    return { ammesso: true };
  } catch {
    // Rete assente, timeout, risposta illeggibile: si passa oltre. Vedi la
    // nota in cima — un guasto di terzi non diventa un guasto nostro.
    return { ammesso: true };
  }
}

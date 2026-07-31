/**
 * Client Redis minimale su API REST (Upstash).
 *
 * Perché REST e non un client TCP: su Vercel ogni invocazione è un processo
 * separato e di breve durata. Un client TCP aprirebbe una connessione per
 * invocazione, esaurendo il pool. L'API REST è una singola richiesta HTTP,
 * senza stato, che è esattamente il modello serverless.
 *
 * Senza le variabili configurate `redis()` restituisce null e i chiamanti
 * ricadono sul comportamento in-memory: lo sviluppo locale funziona senza
 * dipendere da un servizio esterno.
 */
type Command = (string | number)[];

class RedisRest {
  constructor(
    private url: string,
    private token: string
  ) {}

  private async call<T>(body: unknown): Promise<T | null> {
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        // Se Redis non risponde in fretta è meglio proseguire senza:
        // il rate limiting non deve diventare esso stesso un guasto.
        signal: AbortSignal.timeout(1500),
        cache: "no-store",
      });
      if (!res.ok) {
        console.warn(`[redis] risposta ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (e) {
      console.warn("[redis] non raggiungibile, si prosegue senza", e);
      return null;
    }
  }

  async command<T>(cmd: Command): Promise<T | null> {
    const out = await this.call<{ result: T }>(cmd);
    return out ? out.result : null;
  }

  /** Più comandi in un solo round trip. */
  async pipeline<T>(cmds: Command[]): Promise<T[] | null> {
    const out = await this.call<{ result: T }[]>(cmds);
    return out ? out.map((r) => r.result) : null;
  }
}

let cached: RedisRest | null | undefined;

export function redis(): RedisRest | null {
  if (cached !== undefined) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  cached = url && token ? new RedisRest(url, token) : null;
  return cached;
}

export function redisIsConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

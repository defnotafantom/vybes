import { redis } from "@/lib/redis";

/**
 * Rate limiting a finestra fissa.
 *
 * Due implementazioni dietro la stessa firma:
 *  - Redis, quando UPSTASH_REDIS_REST_* sono configurate: il contatore è
 *    condiviso da tutte le istanze, quindi il limite è quello vero.
 *  - Memoria, altrimenti: il limite vale per singola istanza. Su Vercel
 *    significa che con N istanze attive il limite effettivo è N volte quello
 *    dichiarato — meglio di niente, ma non è una difesa seria.
 *
 * Se Redis è configurato ma non risponde, si ricade sulla memoria invece di
 * bloccare la richiesta: un guasto del rate limiter non deve diventare un
 * guasto del sito.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  /** Utile nei test e in diagnostica. */
  backend: "redis" | "memory";
};

export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const client = redis();

  if (client) {
    const result = await limitWithRedis(client, key, limit, windowMs);
    if (result) return result;
    // Redis irraggiungibile: si continua in memoria.
  }

  return limitInMemory(key, limit, windowMs);
}

async function limitWithRedis(
  client: NonNullable<ReturnType<typeof redis>>,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const seconds = Math.ceil(windowMs / 1000);
  // La finestra è ancorata al tempo: la chiave cambia da sola allo scadere,
  // quindi non serve cancellare niente e non ci sono race sul reset.
  const window = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${window}`;

  const out = await client.pipeline<number>([
    ["INCR", redisKey],
    // NX: la scadenza si imposta solo alla prima richiesta della finestra,
    // altrimenti ogni richiesta la prolungherebbe all'infinito.
    ["EXPIRE", redisKey, seconds, "NX"],
  ]);

  if (!out || typeof out[0] !== "number") return null;

  const count = out[0];
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: (window + 1) * windowMs,
    backend: "redis",
  };
}

function limitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, backend: "memory" };
  }

  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    backend: "memory",
  };
}

/** Chiave a partire dalla richiesta: IP più ambito. */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return `${scope}:${ip}`;
}

/** Solo per i test: azzera i contatori in memoria. */
export function __resetInMemoryBuckets() {
  buckets.clear();
}

// Pulizia periodica dei bucket scaduti, per non far crescere la Map.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }, 60_000).unref?.();
}

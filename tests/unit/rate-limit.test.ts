import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, clientKey, __resetInMemoryBuckets } from "@/lib/rate-limit";

beforeEach(() => {
  __resetInMemoryBuckets();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  vi.unstubAllGlobals();
  vi.resetModules();
});
afterEach(() => vi.useRealTimers());

describe("rateLimit — backend in memoria", () => {
  it("consente le richieste entro il limite", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect((await rateLimit(key, 5)).ok).toBe(true);
  });

  it("blocca oltre il limite", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) await rateLimit(key, 3);
    expect((await rateLimit(key, 3)).ok).toBe(false);
  });

  it("decrementa il residuo a ogni richiesta", async () => {
    const key = `test-${Math.random()}`;
    expect((await rateLimit(key, 3)).remaining).toBe(2);
    expect((await rateLimit(key, 3)).remaining).toBe(1);
    expect((await rateLimit(key, 3)).remaining).toBe(0);
  });

  it("riapre la finestra una volta scaduta", async () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    await rateLimit(key, 1, 1000);
    expect((await rateLimit(key, 1, 1000)).ok).toBe(false);
    vi.advanceTimersByTime(1100);
    expect((await rateLimit(key, 1, 1000)).ok).toBe(true);
  });

  it("tiene i contatori separati per chiave", async () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    await rateLimit(a, 1);
    expect((await rateLimit(a, 1)).ok).toBe(false);
    expect((await rateLimit(b, 1)).ok).toBe(true);
  });

  it("dichiara di essere in memoria", async () => {
    expect((await rateLimit(`m-${Math.random()}`, 5)).backend).toBe("memory");
  });
});

describe("rateLimit — backend Redis", () => {
  /** Finto endpoint Upstash: risponde alla pipeline INCR + EXPIRE. */
  function stubRedis(counters: Map<string, number>) {
    process.env.UPSTASH_REDIS_REST_URL = "https://finto.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const cmds = JSON.parse(String(init.body)) as (string | number)[][];
        const results = cmds.map((cmd) => {
          if (cmd[0] === "INCR") {
            const key = String(cmd[1]);
            const next = (counters.get(key) ?? 0) + 1;
            counters.set(key, next);
            return { result: next };
          }
          return { result: 1 };
        });
        return new Response(JSON.stringify(results), { status: 200 });
      })
    );
  }

  it("conta su Redis quando è configurato", async () => {
    const counters = new Map<string, number>();
    stubRedis(counters);
    const { rateLimit: limiter } = await import("@/lib/rate-limit");

    const key = `r-${Math.random()}`;
    expect((await limiter(key, 2)).backend).toBe("redis");
    expect((await limiter(key, 2)).ok).toBe(true);
    expect((await limiter(key, 2)).ok).toBe(false);
  });

  it("ricade sulla memoria se Redis non risponde, invece di bloccare", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://finto.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("rete giù"); }));

    const { rateLimit: limiter } = await import("@/lib/rate-limit");
    const result = await limiter(`f-${Math.random()}`, 5);

    // Il punto: la richiesta passa. Un rate limiter rotto non deve
    // trasformarsi in un blocco totale del sito.
    expect(result.ok).toBe(true);
    expect(result.backend).toBe("memory");
  });
});

/**
 * Lo spegnimento esiste per la suite end-to-end, che fa una dozzina di
 * registrazioni al minuto dallo stesso indirizzo. Queste prove verificano la
 * parte che conta: che **non si possa** portarlo in produzione.
 */
describe("rateLimit — lo spegnimento dichiarato", () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT_DISABILITATO;
    vi.unstubAllEnvs();
  });

  it("lascia passare tutto quando è dichiarato fuori produzione", async () => {
    process.env.RATE_LIMIT_DISABILITATO = "1";
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 20; i++) expect((await rateLimit(key, 3)).ok).toBe(true);
  });

  it("in produzione viene ignorato, comunque lo si imposti", async () => {
    // È la ragione per cui la variabile è accettabile: anche se finisse
    // sull'ambiente sbagliato per una copia distratta, il limitatore
    // continuerebbe a fare il proprio lavoro. `env.ts` rifiuta comunque
    // l'avvio, ma una difesa sola non basta per una difesa.
    process.env.RATE_LIMIT_DISABILITATO = "1";
    vi.stubEnv("NODE_ENV", "production");

    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect((await rateLimit(key, 3)).ok).toBe(true);
    expect((await rateLimit(key, 3)).ok).toBe(false);
  });

  it("un valore diverso da «1» non spegne niente", async () => {
    process.env.RATE_LIMIT_DISABILITATO = "true";
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect((await rateLimit(key, 3)).ok).toBe(true);
    expect((await rateLimit(key, 3)).ok).toBe(false);
  });
});

describe("clientKey", () => {
  it("prende il primo IP della catena x-forwarded-for", () => {
    const req = new Request("https://x.it", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientKey(req, "scope")).toBe("scope:1.2.3.4");
  });

  it("ricade su anon senza header", () => {
    expect(clientKey(new Request("https://x.it"), "scope")).toBe("scope:anon");
  });

  it("separa gli scope a parità di IP", () => {
    const req = new Request("https://x.it", { headers: { "x-forwarded-for": "1.2.3.4" } });
    expect(clientKey(req, "a")).not.toBe(clientKey(req, "b"));
  });
});

import { prisma } from "@/lib/prisma";
import { envReport } from "@/lib/env";
import { emailIsConfigured } from "@/lib/email";
import { redisIsConfigured } from "@/lib/redis";
import { moderazioneImmaginiConfigurata } from "@/lib/moderazione-immagini";

export const dynamic = "force-dynamic";

/**
 * Diagnostica dell'istanza. Serve a rispondere in dieci secondi alla domanda
 * "perché il sito dà 500?" senza aprire i log di Vercel.
 *
 * Non espone segreti: solo booleani su cosa è configurato e cosa no.
 */
export async function GET() {
  const started = Date.now();
  const env = envReport();

  let database: "connected" | "error" = "error";
  let databaseError: string | null = null;
  let users: number | null = null;

  try {
    // Volutamente NON una query raw `SELECT 1`: sembra il test più leggero, ma
    // crea un prepared statement, e il pooler di Neon (PgBouncer in transaction
    // mode) non li supporta. Il risultato è un health check che fallisce mentre
    // l'applicazione funziona benissimo — il peggior tipo di falso allarme.
    // Un count normale passa dallo stesso percorso delle query vere.
    users = await prisma.user.count();
    database = "connected";
  } catch (e) {
    // Gli errori di Prisma iniziano quasi sempre con una riga vuota: prendendo
    // ciecamente la prima si ottiene "", che non dice niente a chi debug.
    if (e instanceof Error) {
      // Prisma mette il motivo vero dopo l'intestazione "Invalid ... invocation":
      // collassando gli spazi si ottiene tutto il messaggio su una riga sola.
      databaseError = e.message.replace(/\s+/g, " ").trim().slice(0, 400);
      const code = (e as { code?: string }).code;
      if (code) databaseError = `${code}: ${databaseError}`;
    } else {
      databaseError = "errore sconosciuto";
    }
  }

  const healthy = database === "connected" && env.valid;

  return Response.json(
    {
      status: healthy ? "healthy" : "degraded",
      database,
      databaseError,
      users,
      config: {
        ...env.features,
        email: emailIsConfigured(),
        // "memory" significa: limite per istanza, non globale.
        rateLimitBackend: redisIsConfigured() ? "redis" : "memory",
        // Falso significa che i caricamenti non vengono classificati: con le
        // registrazioni aperte è un'informazione operativa, non un dettaglio.
        moderazioneImmagini: moderazioneImmaginiConfigurata(),
        envValid: env.valid,
        envErrors: env.errors,
        envFatal: env.fatal,
        envWarnings: env.warnings,
      },
      runtime: {
        onVercel: process.env.VERCEL === "1",
        nodeEnv: process.env.NODE_ENV,
        siteEnv: process.env.SITE_ENV ?? null,
      },
      responseTimeMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
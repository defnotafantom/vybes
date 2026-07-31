import { prisma } from "@/lib/prisma";
import { envReport } from "@/lib/env";
import { emailIsConfigured } from "@/lib/email";
import { redisIsConfigured } from "@/lib/redis";

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
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
    users = await prisma.user.count();
  } catch (e) {
    databaseError = e instanceof Error ? e.message.split("\n")[0] : "errore sconosciuto";
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
        envValid: env.valid,
        envErrors: env.errors,
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

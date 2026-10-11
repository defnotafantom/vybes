import { prisma } from "@/lib/prisma";
import { envReport } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Stato pubblico minimo. Configurazione ed errori interni non escono dall'API. */
export async function GET() {
  let healthy = false;
  try {
    // Verifica il normale percorso ORM senza contare tutti gli utenti.
    await prisma.user.findFirst({ select: { id: true } });
    healthy = envReport().valid;
  } catch {
    // Il messaggio Prisma può contenere dettagli di connessione o della query.
  }
  return Response.json(
    { status: healthy ? "healthy" : "degraded" },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}

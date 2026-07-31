import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscribe, conversationChannel } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel chiude le funzioni dopo questo tempo: lo stream si interrompe e il
// browser riapre da solo. Alzalo se il piano lo consente.
export const maxDuration = 300;

const DB_POLL_MS = 2000;
const HEARTBEAT_MS = 25_000;

/**
 * Stream Server-Sent Events della conversazione.
 *
 * Due sorgenti insieme, ed è la parte importante:
 *
 *  1. Bus in-process — istantaneo, ma copre solo i messaggi scritti dalla
 *     stessa istanza che tiene aperto questo stream.
 *  2. Tailing del database — ogni 2 secondi si chiede se sono comparsi
 *     messaggi più recenti dell'ultimo inviato.
 *
 * Su Vercel, dove chi scrive e chi ascolta finiscono quasi sempre su istanze
 * diverse, il punto 1 da solo non basterebbe. Il punto 2 rende la consegna
 * corretta ovunque senza aggiungere infrastruttura: il database è già la fonte
 * di verità, e una query indicizzata su `(conversationId, createdAt)` con un
 * cursore costa pochissimo.
 *
 * Il dedup è per id, quindi un messaggio che arriva da entrambe le sorgenti
 * viene inviato una volta sola.
 */
export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non autenticato", { status: 401 });

  const { conversationId } = await params;
  const member = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.user.id } },
  });
  if (!member) return new Response("Conversazione non accessibile", { status: 403 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const sent = new Set<string>();
      // Cursore temporale: da qui in poi si cercano i messaggi nuovi.
      let since = new Date();

      const write = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const emit = (message: { id: string; createdAt: string | Date }) => {
        if (sent.has(message.id)) return;
        sent.add(message.id);
        // La finestra di dedup resta piccola: bastano gli ultimi arrivi.
        if (sent.size > 200) sent.delete(sent.values().next().value as string);
        const at = new Date(message.createdAt);
        if (at > since) since = at;
        write({ type: "message", message });
      };

      write({ type: "connected", conversationId, transport: "sse" });

      // Sorgente 1: istantanea, stessa istanza.
      const unsubscribe = subscribe(conversationChannel(conversationId), (payload) => {
        const p = payload as { type?: string; message?: { id: string; createdAt: string } };
        if (p?.type === "message" && p.message) emit(p.message);
      });

      // Sorgente 2: recupera quello che è stato scritto altrove.
      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const rows = await prisma.message.findMany({
            where: { conversationId, createdAt: { gt: since } },
            orderBy: { createdAt: "asc" },
            take: 50,
            include: { sender: { select: { slug: true, name: true, image: true } } },
          });
          for (const row of rows) emit({ ...row, createdAt: row.createdAt.toISOString() } as never);
        } catch (e) {
          console.error("[stream] polling fallito", e);
        }
      }, DB_POLL_MS);

      // Commento SSE: tiene viva la connessione contro i proxy che chiudono
      // gli stream inattivi.
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, HEARTBEAT_MS);

      const cleanup = () => {
        closed = true;
        clearInterval(poll);
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* già chiuso dal client */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

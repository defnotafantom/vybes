import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/notifications";
import { guard, ok, handle } from "@/lib/api";

export async function GET(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "notifications", limit: 120 });
    if (g.error) return g.error;

    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: g.user!.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { actor: { select: { slug: true, name: true, image: true } } },
      }),
      // La stessa domanda era scritta due volte: qui e in `unreadCount()`, che
      // nessuno chiamava. Due copie di «cos'è una notifica non letta»
      // divergono alla prima modifica — e il numero sulla campanella smette di
      // corrispondere all'elenco che si apre premendola, senza che niente si
      // rompa.
      unreadCount(g.user!.id),
    ]);

    return ok({ items, unread });
  });
}

/** Segna come lette: tutte, o solo gli id passati. */
export async function PATCH(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "notifications", limit: 60 });
    if (g.error) return g.error;

    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;

    await prisma.notification.updateMany({
      where: { recipientId: g.user!.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });

    return ok({ read: true });
  });
}

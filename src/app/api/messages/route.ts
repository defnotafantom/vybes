import { prisma } from "@/lib/prisma";
import { guard, ok, fail, handle } from "@/lib/api";

/** Elenco conversazioni con ultimo messaggio e non letti. */
export async function GET(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "messages-read", limit: 120 });
    if (g.error) return g.error;

    const parts = await prisma.conversationParticipant.findMany({
      where: { userId: g.user!.id },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: g.user!.id } },
              include: { user: { select: { slug: true, name: true, image: true } } },
            },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
      take: 50,
    });

    const conversations = await Promise.all(
      parts.map(async (p) => ({
        id: p.conversationId,
        other: p.conversation.participants[0]?.user ?? null,
        lastMessage: p.conversation.messages[0] ?? null,
        unread: await prisma.message.count({
          where: {
            conversationId: p.conversationId,
            senderId: { not: g.user!.id },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        }),
      }))
    );

    return ok(conversations);
  });
}

/** Apre (o riusa) la conversazione 1-a-1 con un altro utente. */
export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "messages-write", limit: 30 });
    if (g.error) return g.error;

    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug : null;
    if (!slug) return fail("Destinatario mancante", 422);

    const other = await prisma.user.findUnique({ where: { slug }, select: { id: true } });
    if (!other) return fail("Utente non trovato", 404);
    if (other.id === g.user!.id) return fail("Non puoi scrivere a te stesso", 400);

    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: g.user!.id } } },
          { participants: { some: { userId: other.id } } },
        ],
      },
      select: { id: true },
    });
    if (existing) return ok({ id: existing.id });

    const conversation = await prisma.conversation.create({
      data: { participants: { create: [{ userId: g.user!.id }, { userId: other.id }] } },
      select: { id: true },
    });

    return ok(conversation, { status: 201 });
  });
}
